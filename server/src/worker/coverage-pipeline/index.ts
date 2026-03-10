import { query, queryOne, execute } from '../../database/connection.js'
import { filterArticles } from './filter.js'
import { clusterArticles } from './cluster.js'
import { deduplicateClusters } from './dedup.js'
import { researchClusters } from './research.js'
import { generateCoveragePost, generateUpdatePost, linkUpdateArticles } from './generator.js'
import { getAgentSetting, publishToCms, plainTextToHtml, generateTags, linkArticleToDevelopingStory } from '../../services/cmsClient.js'
import { emitEvent, EVENTS } from '../../services/events.js'
import type { ResearchResult } from './research.js'

const SCHEDULER_CHECK_INTERVAL = 60 * 1000
const runningAgents = new Set<string>()
const MAX_CONCURRENT_AGENTS = 3
const GENERATE_CONCURRENCY = 3
const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000  // 10 min max per pipeline run

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
    // ─── Step 1: Filter (screen NEW articles only) ────────────────────
    await updateStep(runId, 'filtering', agent.id)
    const { scanned, relevant } = await filterArticles(agent.id, runId)

    if (scanned > 0) {
      console.log(`  [${agent.name}] Screened ${scanned} new articles, ${relevant} relevant`)
    }

    // ─── Step 2: Cluster (find ALL uncovered relevant articles) ───────
    // This is the key change: we cluster articles that haven't been
    // used in any post yet, regardless of when they were screened.
    await updateStep(runId, 'clustering', agent.id)
    const clusters = await clusterArticles(agent.id)

    if (clusters.length === 0) {
      const msg = scanned === 0
        ? 'No new articles and no uncovered relevant articles'
        : `Screened ${scanned} articles (${relevant} relevant) but no clusters formed`
      console.log(`  [${agent.name}] ${msg}. Done.`)
      await execute(
        `UPDATE pipeline_runs SET completed_at = NOW(), articles_found = $1, articles_relevant = $2,
         clusters_found = 0, posts_generated = 0, current_step = 'done' WHERE id = $3`,
        [scanned, relevant, runId],
      )
      return
    }

    // ─── Step 3: Dedup ────────────────────────────────────────────────
    await updateStep(runId, 'deduplicating', agent.id)
    const { newClusters, updateClusters, skippedCount } = await deduplicateClusters(agent.id, clusters)

    if (newClusters.length === 0 && updateClusters.length === 0) {
      console.log(`  [${agent.name}] All ${clusters.length} clusters deduped. Done.`)
      await execute(
        `UPDATE pipeline_runs SET completed_at = NOW(), articles_found = $1, articles_relevant = $2,
         clusters_found = $3, posts_generated = 0, current_step = 'done' WHERE id = $4`,
        [scanned, relevant, clusters.length, runId],
      )
      return
    }

    // ─── Step 4: Research (parallel, non-blocking) ────────────────────
    await updateStep(runId, 'researching', agent.id)
    let researchBriefs = new Map<string, ResearchResult>()
    const allClustersToResearch = [...newClusters, ...updateClusters.map(u => u.cluster)]
    try {
      researchBriefs = await researchClusters(agent.id, allClustersToResearch)
    } catch (error) {
      console.error(`  [${agent.name}] Research stage failed (non-blocking):`, error)
    }

    // Sort by urgency
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, developing: 2, routine: 3 }
    newClusters.sort((a, b) =>
      (urgencyOrder[a.urgency ?? 'routine'] ?? 3) - (urgencyOrder[b.urgency ?? 'routine'] ?? 3),
    )

    // ─── Step 5: Generate posts ───────────────────────────────────────
    await updateStep(runId, 'generating', agent.id)
    let postsGenerated = 0

    // Pre-fetch CMS config once
    const cmsEnabled = await getAgentSetting(agent.id, 'cms_enabled')
    const cmsCategory = cmsEnabled === 'true' ? ((await getAgentSetting(agent.id, 'cms_category')) || 'general') : ''
    const cmsStatus = cmsEnabled === 'true' ? ((await getAgentSetting(agent.id, 'cms_publish_status')) || 'draft') : ''
    const cmsStoryId = cmsEnabled === 'true' ? (await getAgentSetting(agent.id, 'cms_story_id')) : null

    const publishToCmsIfEnabled = async (postId: string) => {
      if (cmsEnabled !== 'true') return
      try {
        const post = await queryOne<{ title: string; summary: string; slug: string; urgency: string; image_landscape: string | null }>(
          'SELECT title, summary, slug, urgency, image_landscape FROM coverage_posts WHERE id = $1',
          [postId],
        )
        if (!post) return
        const tags = generateTags(post.slug || null, null)
        const excerpt = post.summary.split(/\n\n/)[0]?.substring(0, 200) || ''
        const cmsResult = await publishToCms(agent.id, {
          title: post.title,
          slug: post.slug || `cf-${postId.slice(0, 8)}`,
          content: plainTextToHtml(post.summary),
          categorySlug: cmsCategory,
          status: cmsStatus as 'draft' | 'published',
          excerpt, tags,
          seoTitle: post.title, seoDescription: excerpt,
          externalId: postId,
        })
        if (cmsResult.success) {
          console.log(`  [CMS] Published: ${cmsResult.slug}`)
          if (cmsStoryId && cmsResult.slug) {
            await linkArticleToDevelopingStory(agent.id, cmsStoryId, cmsResult.slug, post.title, post.summary, post.urgency, post.image_landscape ?? undefined)
          }
        }
      } catch (cmsError) {
        console.error(`  [CMS] Non-blocking error:`, cmsError)
      }
    }

    // 5a: Generate NEW posts from new clusters
    for (let i = 0; i < newClusters.length; i += GENERATE_CONCURRENCY) {
      const batch = newClusters.slice(i, i + GENERATE_CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(async (cluster) => {
          const brief = researchBriefs.get(cluster.fingerprint)
          const postId = await generateCoveragePost(agent.id, cluster, brief?.briefData ?? null)
          emitEvent(EVENTS.POST_GENERATED, {
            agentId: agent.id, agentName: agent.name, postId,
            title: cluster.fingerprint, urgency: cluster.urgency,
          }).catch(() => {})
          if (cluster.urgency === 'critical' || cluster.urgency === 'high') {
            emitEvent(EVENTS.BREAKING_NEWS, {
              agentId: agent.id, agentName: agent.name, postId,
              title: cluster.fingerprint, urgency: cluster.urgency,
            }).catch(() => {})
          }
          await publishToCmsIfEnabled(postId)
          return postId
        }),
      )
      for (let j = 0; j < results.length; j++) {
        if (results[j].status === 'fulfilled') {
          postsGenerated++
        } else {
          const err = (results[j] as PromiseRejectedResult).reason
          console.error(`  [${agent.name}] Failed to generate post for "${batch[j].fingerprint}":`, err instanceof Error ? err.message : err)
        }
      }
    }

    // 5b: Generate UPDATE posts for developing stories (not just link silently)
    for (let i = 0; i < updateClusters.length; i += GENERATE_CONCURRENCY) {
      const batch = updateClusters.slice(i, i + GENERATE_CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(async ({ cluster, existingPostId }) => {
          const brief = researchBriefs.get(cluster.fingerprint)
          const postId = await generateUpdatePost(agent.id, cluster, existingPostId, brief?.briefData ?? null)
          emitEvent(EVENTS.POST_GENERATED, {
            agentId: agent.id, agentName: agent.name, postId,
            title: `Update: ${cluster.fingerprint}`, urgency: cluster.urgency,
          }).catch(() => {})
          await publishToCmsIfEnabled(postId)
          return postId
        }),
      )
      for (let j = 0; j < results.length; j++) {
        if (results[j].status === 'fulfilled') {
          postsGenerated++
        } else {
          // Fallback: just link articles if update generation fails
          try {
            await linkUpdateArticles(batch[j].cluster, batch[j].existingPostId)
          } catch { /* */ }
          const err = (results[j] as PromiseRejectedResult).reason
          console.error(`  [${agent.name}] Update post failed for "${batch[j].cluster.fingerprint}":`, err instanceof Error ? err.message : err)
        }
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

    console.log(`  [${agent.name}] Pipeline complete: ${scanned} scanned, ${relevant} relevant, ${clusters.length} clusters, ${postsGenerated} posts (${newClusters.length} new, ${updateClusters.length} updates), ${skippedCount} deduped`)
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
  const intervalMs = Math.max(pipelineInterval || 1800, 300) * 1000  // minimum 5 minutes
  return Date.now() - lastRunTime >= intervalMs
}

async function schedulerTick() {
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

    const intervalSetting = await queryOne<{ value: string }>(
      `SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'pipeline_interval'`,
      [row.agent_id],
    )
    const pipelineInterval = parseInt(intervalSetting?.value || '1800', 10)

    const shouldRun = await checkAgentShouldRun(agent.id, pipelineInterval)
    if (!shouldRun) continue

    runningAgents.add(agent.id)
    const pipelineWithTimeout = Promise.race([
      runAgentPipeline(agent),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`Pipeline timed out after ${PIPELINE_TIMEOUT_MS / 60000} minutes`)), PIPELINE_TIMEOUT_MS),
      ),
    ]).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  [${agent.name}] Pipeline timeout/error: ${msg}`)
      await execute(
        `UPDATE pipeline_runs SET completed_at = NOW(), current_step = 'error', error = $1
         WHERE agent_id = $2 AND completed_at IS NULL`,
        [msg, agent.id],
      ).catch(() => {})
    })
    pipelineWithTimeout.finally(() => runningAgents.delete(agent.id))
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

  try { await schedulerTick() } catch (e) { console.error('Initial scheduler tick failed:', e) }

  setInterval(async () => {
    try { await schedulerTick() } catch (e) { console.error('Scheduler tick error:', e) }
  }, SCHEDULER_CHECK_INTERVAL)

  console.log(`Pipeline scheduler running every ${SCHEDULER_CHECK_INTERVAL / 1000}s`)
}
