import { api } from '@/lib/api'
import type { ForgeInput, HistoryItem } from '@/types'

export interface GenerateRequest {
  input: ForgeInput
  workflowId?: string
}

export async function generateContent(request: GenerateRequest): Promise<HistoryItem> {
  return api.post<HistoryItem>('/api/generate', request)
}
