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

export async function clusterArticles(agentId: string, sinceDate: string): Promise<TopicCluster[]> {
  console.log(`  [Cluster] Looking for articles screened after: ${sinceDate}`)

  const articles = await query<RelevantArticle>(
    `SELECT a.id, a.title, a.summary as description, a.language FROM articles a
     JOIN agent_article_screenings aas ON aas.article_id = a.id AND aas.agent_id = $1
     WHERE aas.is_relevant = 1 AND aas.screened_at > $2
     ORDER BY a.created_at ASC`,
    [agentId, sinceDate],
  )

  if (articles.length === 0) {
    console.log('  [Cluster] No newly relevant articles found since last run')
    return []
  }

  console.log(`  [Cluster] ${articles.length} relevant articles to cluster`)

  // Build index-to-ID mapping (prompt uses 1-based indices)
  const indexToId = new Map<number, string>()
  articles.forEach((a, i) => indexToId.set(i + 1, a.id))

  const prompt = await buildClusterPrompt(articles, agentId)
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
