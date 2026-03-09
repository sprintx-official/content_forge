import { api } from '@/lib/api'
import type { ApiKeyConfig, AiModel, AiProvider } from '@/types'

export async function getApiKeys(): Promise<ApiKeyConfig[]> {
  return api.get<ApiKeyConfig[]>('/api/keys')
}

export async function saveApiKey(provider: AiProvider, apiKey: string): Promise<ApiKeyConfig> {
  return api.post<ApiKeyConfig>('/api/keys', { provider, apiKey })
}

export async function deleteApiKey(provider: AiProvider): Promise<void> {
  await api.delete(`/api/keys/${provider}`)
}

export async function getAvailableModels(refresh = false): Promise<AiModel[]> {
  const url = refresh ? '/api/keys/models?refresh=true' : '/api/keys/models'
  return api.get<AiModel[]>(url)
}

export async function getProviderModels(provider: AiProvider): Promise<AiModel[]> {
  return api.get<AiModel[]>(`/api/keys/${provider}/models`)
}

export interface ProviderHealth {
  provider: string
  status: 'healthy' | 'quota_exceeded' | 'invalid' | 'error'
  message: string
}

export async function checkProviderHealth(): Promise<ProviderHealth[]> {
  return api.get<ProviderHealth[]>('/api/keys/health')
}
