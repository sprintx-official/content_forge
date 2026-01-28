import { api } from '@/lib/api'
import type { ModelPricing, AiProvider } from '@/types'

export async function getAllPricing(): Promise<ModelPricing[]> {
  return api.get<ModelPricing[]>('/api/pricing')
}

export async function createPricing(data: {
  provider: AiProvider
  modelPattern: string
  inputPricePerMillion: number
  cachedInputPricePerMillion: number
  outputPricePerMillion: number
}): Promise<ModelPricing> {
  return api.post<ModelPricing>('/api/pricing', data)
}

export async function updatePricing(
  id: string,
  data: Partial<{
    provider: AiProvider
    modelPattern: string
    inputPricePerMillion: number
    cachedInputPricePerMillion: number
    outputPricePerMillion: number
  }>
): Promise<ModelPricing> {
  return api.patch<ModelPricing>(`/api/pricing/${id}`, data)
}

export async function deletePricing(id: string): Promise<void> {
  await api.delete(`/api/pricing/${id}`)
}
