import { query, execute } from '../../database/connection.js'
import { geminiGenerate, extractJson } from './geminiClient.js'
import { buildResearchPrompt, getAgentModel } from './prompts.js'
import type { TopicCluster } from './cluster.js'
import crypto from 'crypto'

const CONCURRENCY = 3
const PER_CLUSTER_TIMEOUT_MS = 45_000

export interface ResearchBriefData {
  topic: {
    context_summary: string
    entities: {
      people: Array<{ name: string; role: string; relevance: string }>
      organizations: Array<{ name: string; type: string; relevance: string }>
      locations: Array<{ name: string; significance: string }>
    }
  }
  seo: {
    primary_keywords: string[]
    secondary_keywords: string[]
    long_tail_keywords: string[]
    content_gaps: string[]
  }
  platforms: Record<string, {
    hashtags: string[]
    trending_keywords: string[]
    format_recommendation: string
  }>
  research_timestamp?: string
}

export interface ResearchResult {
  briefData: ResearchBriefData
}

async function researchCluster(
  agentId: string,
  cluster: TopicCluster,
  model: string,
): Promise<ResearchResult | null> {
  const prompt = await buildResearchPrompt(cluster, agentId)

  const response = await Promise.race([
    geminiGenerate(model, prompt, { useSearch: true }),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Research timed out')), PER_CLUSTER_TIMEOUT_MS),
    ),
  ])

  const parsed = extractJson(response) as ResearchBriefData | null
  if (!parsed || !parsed.topic || !parsed.seo || !parsed.platforms) {
    console.warn(`  [Research] Failed to parse for "${cluster.fingerprint.slice(0, 60)}..."`)
    return null
  }

  if (!parsed.research_timestamp) {
    parsed.research_timestamp = new Date().toISOString()
  }

  return { briefData: parsed }
}

export async function researchClusters(
  agentId: string,
  clusters: TopicCluster[],
): Promise<Map<string, ResearchResult>> {
  const results = new Map<string, ResearchResult>()
  if (clusters.length === 0) return results

  const model = await getAgentModel(agentId, 'model_research')
  console.log(`  [Research] Researching ${clusters.length} clusters with ${model}`)

  for (let i = 0; i < clusters.length; i += CONCURRENCY) {
    const batch = clusters.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map(async (cluster) => {
        try {
          const result = await researchCluster(agentId, cluster, model)
          return { cluster, result }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          console.warn(`  [Research] Error: "${cluster.fingerprint.slice(0, 50)}..." — ${msg}`)
          return { cluster, result: null }
        }
      }),
    )

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled' && settled.value.result) {
        results.set(settled.value.cluster.fingerprint, settled.value.result)
      }
    }
  }

  console.log(`  [Research] Done: ${results.size}/${clusters.length} clusters have briefs`)
  return results
}
