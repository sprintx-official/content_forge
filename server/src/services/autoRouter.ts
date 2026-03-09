import { getActiveKeyPairs } from './apiKeyStore.js'

export interface AutoRouteResult {
  provider: string
  model: string
  apiKey: string
}

// Task-type to optimal provider mapping (ordered by preference)
const TASK_PREFERENCES: Record<string, { provider: string; model: string }[]> = {
  'text-writing': [
    { provider: 'anthropic', model: 'claude-sonnet-4-6-20250217' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'google', model: 'gemini-2.5-flash' },
    { provider: 'xai', model: 'grok-3-mini' },
  ],
  'text-chat': [
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
    { provider: 'google', model: 'gemini-2.0-flash' },
    { provider: 'xai', model: 'grok-3-mini' },
  ],
  image: [
    { provider: 'openai', model: 'gpt-image-1' },
    { provider: 'google', model: 'imagen-3.0-generate-002' },
  ],
  video: [
    { provider: 'google', model: 'veo-3.0-generate-001' },
  ],
  code: [
    { provider: 'anthropic', model: 'claude-sonnet-4-6-20250217' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'google', model: 'gemini-2.5-flash' },
    { provider: 'xai', model: 'grok-3-mini' },
  ],
}

/**
 * Auto-route to the best available provider for a given task type.
 * 1. Look up preferred providers for the task type.
 * 2. Check which providers have active API keys.
 * 3. Pick the first available match (skipping excluded providers).
 * 4. Fallback: any active provider.
 */
export async function autoRoute(taskType: string, excludeProviders?: string[]): Promise<AutoRouteResult> {
  const activeKeys = await getActiveKeyPairs()

  if (activeKeys.length === 0) {
    throw new Error('No AI model available. Configure an API key in Settings.')
  }

  const excluded = new Set(excludeProviders || [])
  const keyMap = new Map(activeKeys.filter((k) => !excluded.has(k.provider)).map((k) => [k.provider, k.api_key]))

  if (keyMap.size === 0) {
    throw new Error('No AI model available. All configured providers have been exhausted. Check your API key balances in Settings.')
  }

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
    anthropic: 'claude-sonnet-4-6-20250217',
    xai: 'grok-3-mini',
    google: 'gemini-2.5-flash',
  }

  const availableKeys = activeKeys.filter((k) => !excluded.has(k.provider))
  const first = availableKeys[0]
  return {
    provider: first.provider,
    model: fallbackModels[first.provider] || 'gpt-4o-mini',
    apiKey: first.api_key,
  }
}

/**
 * Check if a provider error is a credit/quota/auth issue that warrants trying another provider.
 */
export function isRetryableProviderError(statusCode: number): boolean {
  return statusCode === 401 || statusCode === 402 || statusCode === 429
}
