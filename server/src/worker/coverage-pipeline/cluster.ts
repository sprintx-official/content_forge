import { query } from '../../database/connection.js'
import { geminiGenerate, extractJson } from './geminiClient.js'
import { buildClusterPrompt, getAgentModel } from './prompts.js'

interface RelevantArticle {
  id: string
  title: string
  description: string | null
  language: string | null
}

export interface TopicCluster {
  fingerprint: string
  key_facts: string[]
  story_stage: string
  article_ids: string[]
  urgency?: string
}

const MAX_ARTICLES_TO_CLUSTER = 200

/**
 * Find relevant articles that haven't been used in any coverage post yet.
 * This is the key query — it doesn't rely on timestamps, so it works
 * even when all articles were screened hours ago.
 */
export async function clusterArticles(agentId: string): Promise<TopicCluster[]> {
  // Primary: find relevant articles NOT yet linked to any coverage post
  const uncovered = await query<RelevantArticle>(
    `SELECT a.id, a.title, a.summary as description, a.language
     FROM articles a
     JOIN agent_article_screenings aas ON aas.article_id = a.id AND aas.agent_id = $1
     WHERE aas.is_relevant = 1
       AND NOT EXISTS (
         SELECT 1 FROM coverage_source_articles csa WHERE csa.article_id = a.id
       )
     ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC
     LIMIT $2`,
    [agentId, MAX_ARTICLES_TO_CLUSTER],
  )

  if (uncovered.length === 0) {
    console.log('  [Cluster] No uncovered relevant articles found')
    return []
  }

  console.log(`  [Cluster] ${uncovered.length} uncovered relevant articles to cluster`)

  // Build index-to-ID mapping (prompt uses 1-based indices)
  const indexToId = new Map<number, string>()
  uncovered.forEach((a, i) => indexToId.set(i + 1, a.id))

  const prompt = await buildClusterPrompt(uncovered, agentId)
  const model = await getAgentModel(agentId, 'model_cluster')
  const response = await geminiGenerate(model, prompt)

  const parsed = extractJson(response)
  if (parsed === null) {
    console.error('  [Cluster] Failed to extract JSON from response')
    throw new Error('Cluster response was not valid JSON')
  }

  let rawClusters: Array<{
    fingerprint: string
    key_facts: string[]
    story_stage: string
    article_indices?: number[]
    article_ids?: number[]
    urgency?: string
  }>

  if (Array.isArray(parsed)) {
    rawClusters = parsed
  } else if (typeof parsed === 'object' && parsed !== null) {
    const firstArray = Object.values(parsed).find(v => Array.isArray(v)) as typeof rawClusters | undefined
    rawClusters = firstArray ?? []
  } else {
    rawClusters = []
  }

  const clusters: TopicCluster[] = []
  for (const raw of rawClusters) {
    const indices = raw.article_indices || raw.article_ids || []
    const realIds = indices
      .map(idx => indexToId.get(idx))
      .filter((id): id is string => id !== undefined)

    if (realIds.length === 0) continue

    clusters.push({
      fingerprint: raw.fingerprint,
      key_facts: raw.key_facts || [],
      story_stage: raw.story_stage || 'developing',
      article_ids: realIds,
      urgency: raw.urgency || 'routine',
    })
  }

  console.log(`  [Cluster] ${clusters.length} valid topic clusters`)
  for (const c of clusters.slice(0, 5)) {
    console.log(`    - "${c.fingerprint}" (${c.article_ids.length} articles, ${c.urgency})`)
  }

  return clusters
}
