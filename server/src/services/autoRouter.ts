import { query } from '../database/connection.js'

export interface AutoRouteResult {
  provider: string
  model: string
  apiKey: string
}

// Task-type to optimal provider mapping (ordered by preference)
const TASK_PREFERENCES: Record<string, { provider: string; model: string }[]> = {
  'text-writing': [
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'xai', model: 'grok-3-mini' },
    { provider: 'google', model: 'gemini-2.0-flash' },
  ],
  'text-chat': [
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    { provider: 'xai', model: 'grok-3-mini' },
    { provider: 'google', model: 'gemini-2.0-flash' },
  ],
  image: [
    { provider: 'openai', model: 'dall-e-3' },
  ],
  code: [
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'xai', model: 'grok-3-mini' },
    { provider: 'google', model: 'gemini-2.0-flash' },
  ],
}

/**
 * Auto-route to the best available provider for a given task type.
 * 1. Look up preferred providers for the task type.
 * 2. Check which providers have active API keys.
 * 3. Pick the first available match.
 * 4. Fallback: any active provider.
 */
export async function autoRoute(taskType: string): Promise<AutoRouteResult> {
  const activeKeys = await query<{ provider: string; api_key: string }>(
    'SELECT provider, api_key FROM api_keys WHERE is_active = 1'
  )

  if (activeKeys.length === 0) {
    throw new Error('No AI model available. Configure an API key in Settings.')
  }

  const keyMap = new Map(activeKeys.map((k) => [k.provider, k.api_key]))

  // Try preferred providers for this task type
  const preferences = TASK_PREFERENCES[taskType] || TASK_PREFERENCES['text-writing']
  for (const pref of preferences) {
    const apiKey = keyMap.get(pref.provider)
    if (apiKey) {
      return { provider: pref.provider, model: pref.model, apiKey }
    }
  }

  // Fallback: first available provider with a sensible model
  const fallbackModels: Record<string, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-sonnet-4-20250514',
    xai: 'grok-3-mini',
    google: 'gemini-2.0-flash',
  }

  const first = activeKeys[0]
  return {
    provider: first.provider,
    model: fallbackModels[first.provider] || 'gpt-4o-mini',
    apiKey: first.api_key,
  }
}
