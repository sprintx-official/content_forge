import { query } from '../../database/connection.js'
import { getApiKey } from '../../services/apiKeyStore.js'
import { extractJson } from './geminiClient.js'
import { buildDedupPrompt, getAgentModel } from './prompts.js'
import type { TopicCluster } from './cluster.js'

export interface DedupResult {
  newClusters: TopicCluster[]
  updateClusters: { cluster: TopicCluster; existingPostId: string }[]
  skippedCount: number
}

async function callOpenAI(model: string, prompt: string): Promise<string> {
  const keyRow = await getApiKey('openai')
  const apiKey = keyRow?.api_key || process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 1000,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI API error (${res.status})`)
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content ?? ''
}

export async function deduplicateClusters(agentId: string, clusters: TopicCluster[]): Promise<DedupResult> {
  const recentPosts = await query<{ id: string; fingerprint: string; key_facts: string }>(
    `SELECT id, fingerprint, key_facts FROM coverage_posts
     WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '3 days'
     ORDER BY created_at DESC`,
    [agentId],
  )

  if (recentPosts.length === 0) {
    return { newClusters: clusters, updateClusters: [], skippedCount: 0 }
  }

  console.log(`  [Dedup] Checking ${clusters.length} clusters against ${recentPosts.length} recent posts`)

  const newClusters: TopicCluster[] = []
  const updateClusters: { cluster: TopicCluster; existingPostId: string }[] = []
  let skippedCount = 0

  // Pre-compute best matches (pure CPU, no I/O)
  const clustersWithMatches: Array<{
    cluster: TopicCluster
    bestMatch: { post: typeof recentPosts[0]; overlapScore: number } | null
  }> = clusters.map(cluster => {
    let bestMatch: { post: typeof recentPosts[0]; overlapScore: number } | null = null
    for (const post of recentPosts) {
      const existingWords = new Set(post.fingerprint.toLowerCase().split(/\s+/))
      const newWords = cluster.fingerprint.toLowerCase().split(/\s+/)
      const overlap = newWords.filter(w => existingWords.has(w)).length / Math.max(newWords.length, 1)
      if (overlap > 0.4 && (!bestMatch || overlap > bestMatch.overlapScore)) {
        bestMatch = { post, overlapScore: overlap }
      }
    }
    return { cluster, bestMatch }
  })

  // Separate clusters that need API calls from those that don't
  const noMatchClusters = clustersWithMatches.filter(c => !c.bestMatch)
  const needsApiClusters = clustersWithMatches.filter(c => c.bestMatch)

  noMatchClusters.forEach(c => newClusters.push(c.cluster))

  // Dedup API calls in parallel batches of 5
  const DEDUP_CONCURRENCY = 5
  const model = await getAgentModel(agentId, 'model_dedup')

  for (let i = 0; i < needsApiClusters.length; i += DEDUP_CONCURRENCY) {
    const batch = needsApiClusters.slice(i, i + DEDUP_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async ({ cluster, bestMatch }) => {
        let existingKeyFacts: string[] = []
        try { existingKeyFacts = JSON.parse(bestMatch!.post.key_facts) } catch { /* */ }

        const prompt = await buildDedupPrompt(
          cluster.fingerprint, cluster.key_facts,
          bestMatch!.post.fingerprint, existingKeyFacts, agentId,
        )
        const response = await callOpenAI(model, prompt)
        const dedupResult = extractJson(response) as { is_new_development: boolean; reason: string } | null
        return { cluster, bestMatch, dedupResult }
      }),
    )

    for (const settled of results) {
      if (settled.status === 'rejected' || !settled.value.dedupResult) {
        const cluster = settled.status === 'fulfilled' ? settled.value.cluster : batch[0].cluster
        newClusters.push(cluster)
        continue
      }
      const { cluster, bestMatch, dedupResult } = settled.value
      if (dedupResult.is_new_development) {
        console.log(`  [Dedup] New: "${cluster.fingerprint}" — ${dedupResult.reason}`)
        newClusters.push(cluster)
      } else {
        console.log(`  [Dedup] Update: "${cluster.fingerprint}" — ${dedupResult.reason}`)
        updateClusters.push({ cluster, existingPostId: bestMatch!.post.id })
        skippedCount++
      }
    }
  }

  console.log(`  [Dedup] ${newClusters.length} new, ${updateClusters.length} updates, ${skippedCount} skipped`)
  return { newClusters, updateClusters, skippedCount }
}
