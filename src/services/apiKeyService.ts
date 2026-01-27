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

export async function getAvailableModels(): Promise<AiModel[]> {
  return api.get<AiModel[]>('/api/keys/models')
}

export async function getProviderModels(provider: AiProvider): Promise<AiModel[]> {
  return api.get<AiModel[]>(`/api/keys/${provider}/models`)
}
