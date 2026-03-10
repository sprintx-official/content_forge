import { query, execute } from '../../database/connection.js'
import { getApiKey } from '../../services/apiKeyStore.js'
import { buildFilterPrompt, getAgentModel } from './prompts.js'

interface UnscreenedArticle {
  id: string
  title: string
  description: string | null
}

const BATCH_SIZE = 25
const MAX_BATCHES_PER_RUN = 15

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
      max_completion_tokens: 4000,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${err}`)
  }
  const data = await res.json() as { choices: Array<{ message: { content: string }; finish_reason: string }> }
  return data.choices[0]?.message?.content ?? ''
}

export async function filterArticles(
  agentId: string,
  runId?: string,
): Promise<{ scanned: number; relevant: number }> {
  const unscreened = await query<UnscreenedArticle>(
    `SELECT a.id, a.title, a.summary as description FROM articles a
     JOIN agent_feeds af ON af.feed_id = a.feed_id AND af.agent_id = $1
     LEFT JOIN agent_article_screenings aas ON aas.article_id = a.id AND aas.agent_id = $1
     WHERE aas.screened_at IS NULL
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [agentId, MAX_BATCHES_PER_RUN * BATCH_SIZE],
  )

  if (unscreened.length === 0) return { scanned: 0, relevant: 0 }

  const model = await getAgentModel(agentId, 'model_filter')
  console.log(`  [Filter] ${unscreened.length} unscreened articles, using ${model}`)

  let totalRelevant = 0
  let totalScanned = 0
  let batchErrors = 0

  for (let i = 0; i < unscreened.length; i += BATCH_SIZE) {
    const batch = unscreened.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const prompt = await buildFilterPrompt(batch, agentId)

    try {
      const raw = await callOpenAI(model, prompt)

      const jsonMatch = raw.match(/\[[\s\S]*?\]/)
      const content = jsonMatch ? jsonMatch[0] : '[]'
      let relevantIds: string[]
      try {
        const parsed = JSON.parse(content)
        relevantIds = Array.isArray(parsed) ? parsed.map(String) : []
      } catch {
        console.error(`  [Filter] Failed to parse batch ${batchNum}`)
        relevantIds = []
      }

      const relevantSet = new Set(relevantIds)

      // Batch insert all screenings in parallel
      const screeningPromises = batch.map(article => {
        const isRelevant = relevantSet.has(article.id) || relevantSet.has(String(article.id)) ? 1 : 0
        if (isRelevant) totalRelevant++
        return execute(
          `INSERT INTO agent_article_screenings (id, agent_id, article_id, is_relevant, screened_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())
           ON CONFLICT (agent_id, article_id) DO UPDATE SET is_relevant = $3, screened_at = NOW()`,
          [agentId, article.id, isRelevant],
        )
      })
      await Promise.all(screeningPromises)
      totalScanned += batch.length

      if (runId) {
        await execute(
          `UPDATE pipeline_runs SET current_step = $1 WHERE id = $2`,
          [`filtering ${batchNum}/${Math.ceil(unscreened.length / BATCH_SIZE)} (${totalRelevant} relevant)`, runId],
        )
      }

      console.log(`  [Filter] Batch ${batchNum}: ${relevantSet.size}/${batch.length} relevant`)
    } catch (error) {
      batchErrors++
      console.error(`  [Filter] Batch ${batchNum} failed:`, error instanceof Error ? error.message : error)
      if (batchErrors >= 3) {
        console.error('  [Filter] Too many errors, stopping')
        break
      }
    }
  }

  if (totalScanned === 0 && batchErrors > 0) {
    throw new Error(`Filter step failed: all batches errored. Check OpenAI API key and model "${model}"`)
  }

  return { scanned: totalScanned, relevant: totalRelevant }
}
