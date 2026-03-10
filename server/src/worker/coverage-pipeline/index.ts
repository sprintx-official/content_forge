import { query, queryOne, execute } from '../../database/connection.js'
import { filterArticles } from './filter.js'
import { clusterArticles } from './cluster.js'
import { deduplicateClusters } from './dedup.js'
import { researchClusters } from './research.js'
import { generateCoveragePost, linkUpdateArticles } from './generator.js'
import { getAgentSetting, publishToCms, plainTextToHtml, generateTags, linkArticleToDevelopingStory } from '../../services/cmsClient.js'
import { emitEvent, EVENTS } from '../../services/events.js'
import type { ResearchResult } from './research.js'

const SCHEDULER_CHECK_INTERVAL = 60 * 1000
const runningAgents = new Set<string>()
const MAX_CONCURRENT_AGENTS = 3

interface AgentRow {
  id: string
  name: string
  system_prompt: string
}

async function updateStep(runId: string, step: string, agentId?: string) {
  await execute(`UPDATE pipeline_runs SET current_step = $1 WHERE id = $2`, [step, runId])
  emitEvent(EVENTS.PIPELINE_STEP, { runId, step, agentId }).catch(() => {})
}

async function runAgentPipeline(agent: AgentRow) {
  console.log(`\n[${new Date().toISOString()}] Pipeline starting for agent: ${agent.name}`)

  const runId = crypto.randomUUID()
  await execute(
    `INSERT INTO pipeline_runs (id, agent_id, started_at, current_step)
     VALUES ($1, $2, NOW(), 'starting')`,
    [runId, agent.id],
  )

  emitEvent(EVENTS.PIPELINE_STARTED, { agentId: agent.id, agentName: agent.name, runId }).catch(() => {})

  try {
    // Step 1: Filter
    await updateStep(runId, 'filtering', agent.id)
    const { scanned, relevant } = await filterArticles(agent.id, runId)

    if (relevant === 0) {
      const reason = scanned === 0
        ? 'No unscreened articles found'
        : `Scanned ${scanned} articles but none passed relevance filter`
      console.log(`  [${agent.name}] ${reason}. Skipping.`)
      await execute(
        `UPDATE pipeline_runs SET completed_at = NOW(), articles_found = $1, articles_relevant = 0,
         clusters_found = 0, posts_generated = 0, current_step = 'done', error = $2 WHERE id = $3`,
        [scanned, scanned === 0 ? reason : null, runId],
      )
      return
    }

    // Step 2: Cluster
    await updateStep(runId, 'clustering', agent.id)
    const lastRunRow = await queryOne<{ completed_at: string }>(
      `SELECT completed_at FROM pipeline_runs
       WHERE agent_id = $1 AND id != $2 AND completed_at IS NOT NULL
       ORDER BY started_at DESC LIMIT 1`,
      [agent.id, runId],
    )
    const sinceDate = lastRunRow?.completed_at || '2000-01-01T00:00:00.000Z'
    const clusters = await clusterArticles(agent.id, sinceDate)

    if (clusters.length === 0) {
      console.log(`  [${agent.name}] No clusters formed. Skipping.`)
      await execute(
        `UPDATE pipeline_runs SET completed_at = NOW(), articles_found = $1, articles_relevant = $2,
         clusters_found = 0, posts_generated = 0, current_step = 'done' WHERE id = $3`,
        [scanned, relevant, runId],
      )
      return
    }

    // Step 3: Dedup
    await updateStep(runId, 'deduplicating', agent.id)
    const { newClusters, updateClusters, skippedCount } = await deduplicateClusters(agent.id, clusters)

    // Step 4: Research
    await updateStep(runId, 'researching', agent.id)
    let researchBriefs = new Map<string, ResearchResult>()
    try {
      researchBriefs = await researchClusters(agent.id, newClusters)
    } catch (error) {
      console.error(`  [${agent.name}] Research stage failed (non-blocking):`, error)
    }

    // Sort by urgency
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, developing: 2, routine: 3 }
    newClusters.sort((a, b) =>
      (urgencyOrder[a.urgency ?? 'routine'] ?? 3) - (urgencyOrder[b.urgency ?? 'routine'] ?? 3),
    )

    // Step 5: Generate
    await updateStep(runId, 'generating', agent.id)
    let postsGenerated = 0

    for (const cluster of newClusters) {
      try {
        const brief = researchBriefs.get(cluster.fingerprint)
        const postId = await generateCoveragePost(agent.id, cluster, brief?.briefData ?? null)
        postsGenerated++

        emitEvent(EVENTS.POST_GENERATED, {
          agentId: agent.id, agentName: agent.name, postId,
          title: cluster.fingerprint, urgency: cluster.urgency,
        }).catch(() => {})

        // Emit breaking news event for critical/high urgency
        if (cluster.urgency === 'critical' || cluster.urgency === 'high') {
          emitEvent(EVENTS.BREAKING_NEWS, {
            agentId: agent.id, agentName: agent.name, postId,
            title: cluster.fingerprint, urgency: cluster.urgency,
          }).catch(() => {})
        }

        // Auto-publish to CMS if enabled
        try {
          const cmsEnabled = await getAgentSetting(agent.id, 'cms_enabled')
          if (cmsEnabled === 'true') {
            const post = await queryOne<{ title: string; summary: string; slug: string; urgency: string; image_landscape: string | null }>(
              'SELECT title, summary, slug, urgency, image_landscape FROM coverage_posts WHERE id = $1',
              [postId],
            )
            if (post) {
              const cmsCategory = (await getAgentSetting(agent.id, 'cms_category')) || 'general'
              const cmsStatus = (await getAgentSetting(agent.id, 'cms_publish_status')) || 'draft'
              const tags = generateTags(post.slug || null, null)
              const excerpt = post.summary.split(/\n\n/)[0]?.substring(0, 200) || ''

              const cmsResult = await publishToCms(agent.id, {
                title: post.title,
                slug: post.slug || `cf-${postId.slice(0, 8)}`,
                content: plainTextToHtml(post.summary),
                categorySlug: cmsCategory,
                status: cmsStatus as 'draft' | 'published',
                excerpt,
                tags,
                seoTitle: post.title,
                seoDescription: excerpt,
                externalId: postId,
              })

              if (cmsResult.success) {
                console.log(`  [CMS] Published: ${cmsResult.slug}`)
                // Link to developing story if applicable
                const cmsStoryId = await getAgentSetting(agent.id, 'cms_story_id')
                if (cmsStoryId && cmsResult.slug) {
                  await linkArticleToDevelopingStory(agent.id, cmsStoryId, cmsResult.slug, post.title, post.summary, post.urgency, post.image_landscape ?? undefined)
                }
              }
            }
          }
        } catch (cmsError) {
          console.error(`  [CMS] Non-blocking error:`, cmsError)
        }
      } catch (error) {
        console.error(`  [${agent.name}] Failed to generate post for "${cluster.fingerprint}":`, error instanceof Error ? error.message : error)
      }
    }

    // Link update articles to existing posts
    for (const { cluster, existingPostId } of updateClusters) {
      try {
        await linkUpdateArticles(cluster, existingPostId)
      } catch (error) {
        console.error(`  [${agent.name}] Failed to link updates for post ${existingPostId}:`, error)
      }
    }

    await execute(
      `UPDATE pipeline_runs SET completed_at = NOW(), articles_found = $1, articles_relevant = $2,
       clusters_found = $3, posts_generated = $4, current_step = 'done' WHERE id = $5`,
      [scanned, relevant, clusters.length, postsGenerated, runId],
    )

    emitEvent(EVENTS.PIPELINE_COMPLETED, {
      agentId: agent.id, agentName: agent.name, runId,
      scanned, relevant, clusters: clusters.length, generated: postsGenerated, deduped: skippedCount,
    }).catch(() => {})

    console.log(`  [${agent.name}] Pipeline complete: ${scanned} scanned, ${relevant} relevant, ${clusters.length} clusters, ${postsGenerated} generated, ${skippedCount} deduped`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`  [${agent.name}] Pipeline error: ${errorMsg}`)
    await execute(
      `UPDATE pipeline_runs SET completed_at = NOW(), current_step = 'error', error = $1 WHERE id = $2`,
      [errorMsg, runId],
    ).catch(() => {})
  }
}

async function checkAgentShouldRun(agentId: string, pipelineInterval: number): Promise<boolean> {
  // Check for manually queued runs
  const queued = await queryOne<{ id: string }>(
    `SELECT id FROM pipeline_runs WHERE agent_id = $1 AND current_step = 'queued' AND completed_at IS NULL LIMIT 1`,
    [agentId],
  )
  if (queued) {
    await execute('DELETE FROM pipeline_runs WHERE id = $1', [queued.id])
    return true
  }

  const lastRun = await queryOne<{ completed_at: string }>(
    `SELECT completed_at FROM pipeline_runs WHERE agent_id = $1 AND completed_at IS NOT NULL ORDER BY started_at DESC LIMIT 1`,
    [agentId],
  )
  const lastRunTime = lastRun ? new Date(lastRun.completed_at).getTime() : 0
  const intervalMs = (pipelineInterval || 1800) * 1000
  return Date.now() - lastRunTime >= intervalMs
}

async function schedulerTick() {
  // Find agents with pipeline enabled (stored as agent_setting 'pipeline_enabled' = 'true')
  const enabledAgents = await query<{ agent_id: string }>(
    `SELECT agent_id FROM agent_settings WHERE key = 'pipeline_enabled' AND value = 'true'`,
  )

  for (const row of enabledAgents) {
    if (runningAgents.has(row.agent_id)) continue
    if (runningAgents.size >= MAX_CONCURRENT_AGENTS) break

    const agent = await queryOne<AgentRow>(
      'SELECT id, name, system_prompt FROM agents WHERE id = $1',
      [row.agent_id],
    )
    if (!agent) continue

    // Get pipeline interval (default 30 min)
    const intervalSetting = await queryOne<{ value: string }>(
      `SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'pipeline_interval'`,
      [row.agent_id],
    )
    const pipelineInterval = parseInt(intervalSetting?.value || '1800', 10)

    const shouldRun = await checkAgentShouldRun(agent.id, pipelineInterval)
    if (!shouldRun) continue

    runningAgents.add(agent.id)
    runAgentPipeline(agent).finally(() => runningAgents.delete(agent.id))
  }
}

async function cleanupOrphanedRuns() {
  await execute(
    `UPDATE pipeline_runs SET completed_at = NOW(), current_step = 'error',
     error = 'Worker restarted — orphaned run cleaned up'
     WHERE completed_at IS NULL`,
  )
}

export async function startPipelineWorker() {
  console.log('Coverage Pipeline Worker starting...')
  await cleanupOrphanedRuns()

  // Initial tick
  try { await schedulerTick() } catch (e) { console.error('Initial scheduler tick failed:', e) }

  // Schedule recurring ticks
  setInterval(async () => {
    try { await schedulerTick() } catch (e) { console.error('Scheduler tick error:', e) }
  }, SCHEDULER_CHECK_INTERVAL)

  console.log(`Pipeline scheduler running every ${SCHEDULER_CHECK_INTERVAL / 1000}s`)
}
