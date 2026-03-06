import crypto from 'crypto'
import { GoogleGenAI } from '@google/genai'
import { query, execute } from '../database/connection.js'
import { getApiKey } from './apiKeyStore.js'

interface LLMResponse {
  provider: string
  response: string
  timestamp: string
}

interface AnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  entities: string[]
}

// ---------------------------------------------------------------------------
// Query individual LLM providers
// ---------------------------------------------------------------------------

async function queryOpenAI(queryText: string): Promise<LLMResponse | null> {
  const key = await getApiKey('openai')
  if (!key) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key.api_key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [{ role: 'user', content: queryText }],
        max_tokens: 1000,
      }),
    })
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    return {
      provider: 'openai',
      response: data.choices?.[0]?.message?.content || '',
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[Brand Monitor] OpenAI query failed:', err)
    return null
  }
}

async function queryGemini(queryText: string): Promise<LLMResponse | null> {
  const key = await getApiKey('google')
  if (!key) return null
  try {
    const ai = new GoogleGenAI({ apiKey: key.api_key })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: queryText,
    })
    return {
      provider: 'gemini',
      response: response.text ?? '',
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[Brand Monitor] Gemini query failed:', err)
    return null
  }
}

async function queryAnthropic(queryText: string): Promise<LLMResponse | null> {
  const key = await getApiKey('anthropic')
  if (!key) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key.api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: queryText }],
      }),
    })
    const data = await res.json() as { content?: { text?: string }[] }
    return {
      provider: 'anthropic',
      response: data.content?.[0]?.text || '',
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[Brand Monitor] Anthropic query failed:', err)
    return null
  }
}

async function queryXai(queryText: string): Promise<LLMResponse | null> {
  const key = await getApiKey('xai')
  if (!key) return null
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key.api_key}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini-fast',
        messages: [{ role: 'user', content: queryText }],
        max_tokens: 1000,
      }),
    })
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    return {
      provider: 'xai',
      response: data.choices?.[0]?.message?.content || '',
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[Brand Monitor] xAI query failed:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Query all configured providers
// ---------------------------------------------------------------------------
async function queryAllProviders(queryText: string): Promise<LLMResponse[]> {
  const results = await Promise.allSettled([
    queryOpenAI(queryText),
    queryGemini(queryText),
    queryAnthropic(queryText),
    queryXai(queryText),
  ])

  return results
    .filter((r): r is PromiseFulfilledResult<LLMResponse | null> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value!)
}

// ---------------------------------------------------------------------------
// Analyze response for sentiment and entities
// ---------------------------------------------------------------------------
async function analyzeResponse(response: LLMResponse, brandQuery: string): Promise<AnalysisResult> {
  const key = await getApiKey('google')
  if (!key) return { sentiment: 'neutral', entities: [] }

  try {
    const ai = new GoogleGenAI({ apiKey: key.api_key })
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this LLM response about "${brandQuery}". Return ONLY valid JSON:
{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "entities": ["entity1", "entity2"]
}

LLM Provider: ${response.provider}
Response: ${response.response.slice(0, 2000)}`,
    })

    const text = (result.text ?? '').trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
    const parsed = JSON.parse(jsonMatch[1] || text)

    return {
      sentiment: parsed.sentiment || 'neutral',
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    }
  } catch {
    return { sentiment: 'neutral', entities: [] }
  }
}

// ---------------------------------------------------------------------------
// Run brand monitoring queries
// ---------------------------------------------------------------------------
export async function runBrandQueries(): Promise<void> {
  const queries = await query<{ id: string; agent_id: string | null; query: string; frequency: string }>(
    `SELECT bq.id, bq.agent_id, bq.query, bq.frequency
     FROM brand_queries bq
     WHERE bq.is_active = 1
       AND NOT EXISTS (
         SELECT 1 FROM brand_results br
         WHERE br.query_id = bq.id
           AND br.created_at > NOW() - CASE bq.frequency
             WHEN 'daily' THEN INTERVAL '23 hours'
             WHEN 'weekly' THEN INTERVAL '6 days'
             ELSE INTERVAL '23 hours'
           END
       )`,
  )

  if (queries.length === 0) return

  console.log(`[Brand Monitor] Running ${queries.length} brand queries`)

  for (const q of queries) {
    try {
      const responses = await queryAllProviders(q.query)

      for (const response of responses) {
        const analysis = await analyzeResponse(response, q.query)

        await execute(
          `INSERT INTO brand_results (id, query_id, provider, response, sentiment, entities, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            crypto.randomUUID(),
            q.id,
            response.provider,
            response.response,
            analysis.sentiment,
            JSON.stringify(analysis.entities),
          ],
        )
      }

      console.log(`  Query "${q.query.slice(0, 50)}..." — ${responses.length} provider responses`)
    } catch (error) {
      console.error(`  Failed query #${q.id}:`, error)
    }
  }
}
