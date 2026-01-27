import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, ApiKeyRow } from '../types.js'

const router = Router()

const VALID_PROVIDERS = ['openai', 'anthropic', 'xai', 'google']

function maskKey(key: string): string {
  if (key.length <= 4) return '••••••••'
  return '••••••••' + key.slice(-4)
}

function formatApiKey(row: ApiKeyRow) {
  return {
    id: row.id,
    provider: row.provider,
    maskedKey: maskKey(row.api_key),
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ────────────────────────────────────────────────────────────
// Dynamic model fetching from provider APIs
// ────────────────────────────────────────────────────────────

interface ProviderModel {
  id: string
  name: string
  provider: string
}

/**
 * Validates an API key by making a lightweight test call to the provider.
 * Returns null on success, or an error message string on failure.
 */
async function validateApiKey(provider: string, apiKey: string): Promise<string | null> {
  try {
    switch (provider) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (res.status === 401) return 'Invalid OpenAI API key'
        if (!res.ok) return `OpenAI returned status ${res.status}`
        return null
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-3-5-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        })
        if (res.status === 401 || res.status === 403) return 'Invalid Anthropic API key'
        return null
      }

      case 'xai': {
        const res = await fetch('https://api.x.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (res.status === 401) return 'Invalid xAI API key'
        if (!res.ok) return `xAI returned status ${res.status}`
        return null
      }

      case 'google': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
        )
        if (res.status === 400 || res.status === 403) return 'Invalid Google API key'
        if (!res.ok) return `Google returned status ${res.status}`
        return null
      }

      default:
        return 'Unknown provider'
    }
  } catch (err) {
    return `Failed to validate key: ${err instanceof Error ? err.message : 'network error'}`
  }
}

function formatOpenAIName(id: string): string {
  return id
    .replace(/^gpt-/i, 'GPT-')
    .replace(/^o(\d)/i, 'O$1')
    .replace(/^chatgpt-/i, 'ChatGPT-')
    .replace(/-mini/gi, ' Mini')
    .replace(/-turbo/gi, ' Turbo')
}

function formatXAIName(id: string): string {
  // grok-3 → Grok 3, grok-3-mini → Grok 3 Mini
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Fetches available chat models from a provider's API.
 */
async function fetchProviderModels(provider: string, apiKey: string): Promise<ProviderModel[]> {
  try {
    switch (provider) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (!res.ok) return []
        const data = await res.json() as { data: { id: string }[] }
        return data.data
          .filter((m) => {
            // Include chat models only
            if (!/^(gpt-|o\d|chatgpt-)/i.test(m.id)) return false
            // Exclude non-chat model types
            if (/embedding|whisper|dall-e|tts|moderation|babbage|davinci/i.test(m.id)) return false
            // Exclude date-stamped variants (e.g. gpt-4o-2024-11-20)
            if (/-\d{4}-\d{2}-\d{2}/.test(m.id)) return false
            // Exclude audio/realtime/search variants
            if (/audio|realtime|search/i.test(m.id)) return false
            return true
          })
          .map((m) => ({ id: m.id, name: formatOpenAIName(m.id), provider }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        })
        if (!res.ok) return []
        const data = await res.json() as { data: { id: string; display_name: string }[] }
        return (data.data || [])
          .filter((m) => /claude/i.test(m.id))
          // Exclude date-stamped variants when a base version exists
          .filter((m) => !/-\d{8}$/.test(m.id) || !data.data.some(
            (other) => other.id !== m.id && m.id.startsWith(other.id)
          ))
          .map((m) => ({
            id: m.id,
            name: m.display_name || m.id,
            provider,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }

      case 'xai': {
        const res = await fetch('https://api.x.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (!res.ok) return []
        const data = await res.json() as { data: { id: string }[] }
        return (data.data || [])
          .filter((m) => /grok/i.test(m.id))
          .filter((m) => !/-\d{4}-\d{2}-\d{2}/.test(m.id))
          .map((m) => ({ id: m.id, name: formatXAIName(m.id), provider }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }

      case 'google': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
        )
        if (!res.ok) return []
        const data = await res.json() as {
          models: {
            name: string
            displayName: string
            supportedGenerationMethods?: string[]
          }[]
        }
        return (data.models || [])
          .filter((m) => {
            // Only models that support content generation
            if (!m.supportedGenerationMethods?.includes('generateContent')) return false
            // Only Gemini models
            if (!/gemini/i.test(m.name)) return false
            return true
          })
          .map((m) => ({
            // name is "models/gemini-2.5-pro" — extract the ID part
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', ''),
            provider,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }

      default:
        return []
    }
  } catch {
    return []
  }
}

// ────────────────────────────────────────────────────────────
// In-memory cache for the /models endpoint (used by forge page)
// ────────────────────────────────────────────────────────────

let modelsCache: { models: ProviderModel[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function invalidateModelsCache() {
  modelsCache = null
}

// ────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────

// GET /api/keys — List all keys (masked)
router.get('/', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const rows = await query<ApiKeyRow>('SELECT * FROM api_keys ORDER BY provider ASC')
  res.json(rows.map(formatApiKey))
})

// GET /api/keys/usage — Aggregate token usage stats (admin only)
router.get('/usage', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const byModel = await query(`
    SELECT provider, model,
      COUNT(*) as generation_count,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost_usd
    FROM token_usage
    GROUP BY provider, model
    ORDER BY total_cost_usd DESC
  `)

  const byProvider = await query(`
    SELECT provider,
      COUNT(*) as generation_count,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost_usd
    FROM token_usage
    GROUP BY provider
    ORDER BY total_cost_usd DESC
  `)

  res.json({ byModel, byProvider })
})

// GET /api/keys/models — Get all available models across active providers (cached)
router.get('/models', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  // Return from cache if fresh
  if (modelsCache && Date.now() < modelsCache.expiresAt) {
    res.json(modelsCache.models)
    return
  }

  const rows = await query<ApiKeyRow>(
    'SELECT provider, api_key FROM api_keys WHERE is_active = 1'
  )

  // Fetch from all providers in parallel
  const results = await Promise.all(
    rows.map((row) => fetchProviderModels(row.provider, row.api_key))
  )
  const models = results.flat()

  modelsCache = { models, expiresAt: Date.now() + CACHE_TTL_MS }
  res.json(models)
})

// GET /api/keys/:provider/models — Fetch live models for a specific provider
router.get('/:provider/models', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const provider = req.params.provider as string
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: 'Invalid provider' })
    return
  }

  const row = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1', [provider]
  )
  if (!row) {
    res.status(404).json({ error: 'No active API key for this provider' })
    return
  }

  const models = await fetchProviderModels(provider, row.api_key)
  res.json(models)
})

// POST /api/keys — Add or update key (upsert by provider)
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { provider, apiKey } = req.body
  if (!provider || !apiKey) {
    res.status(400).json({ error: 'Provider and apiKey are required' })
    return
  }
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` })
    return
  }

  // Validate the key by making a test API call
  const validationError = await validateApiKey(provider, apiKey)
  if (validationError) {
    res.status(422).json({ error: validationError })
    return
  }

  const now = new Date().toISOString()
  const existing = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE provider = $1', [provider]
  )

  if (existing) {
    await execute(
      'UPDATE api_keys SET api_key = $1, is_active = 1, updated_at = $2 WHERE provider = $3',
      [apiKey, now, provider]
    )
    const updated = (await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE provider = $1', [provider]
    ))!
    invalidateModelsCache()
    res.json(formatApiKey(updated))
  } else {
    const id = crypto.randomUUID()
    await execute(
      'INSERT INTO api_keys (id, provider, api_key, is_active, created_at, updated_at) VALUES ($1, $2, $3, 1, $4, $5)',
      [id, provider, apiKey, now, now]
    )
    const created = (await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE id = $1', [id]
    ))!
    invalidateModelsCache()
    res.status(201).json(formatApiKey(created))
  }
})

// DELETE /api/keys/:provider — Remove key for a provider
router.delete('/:provider', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const provider = req.params.provider as string
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` })
    return
  }

  const existing = await queryOne(
    'SELECT id FROM api_keys WHERE provider = $1', [provider]
  )
  if (!existing) {
    res.status(404).json({ error: 'No API key found for this provider' })
    return
  }

  await execute('DELETE FROM api_keys WHERE provider = $1', [provider])
  invalidateModelsCache()
  res.json({ success: true })
})

export default router
