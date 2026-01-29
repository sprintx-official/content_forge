import { api } from '@/lib/api'
import type { FeedbackItem } from '@/types'

export async function getAllFeedback(): Promise<FeedbackItem[]> {
  const res = await api.get<{ data: FeedbackItem[]; pagination: unknown }>('/api/feedback')
  return res.data
}

export async function getFeedbackByAgentId(agentId: string): Promise<FeedbackItem[]> {
  const res = await api.get<{ data: FeedbackItem[]; pagination: unknown }>(`/api/feedback/agent/${agentId}`)
  return res.data
}

export async function getFeedbackCountByAgentId(agentId: string): Promise<number> {
  const items = await getFeedbackByAgentId(agentId)
  return items.length
}

export async function getAverageRatingByAgentId(agentId: string): Promise<number> {
  const items = await getFeedbackByAgentId(agentId)
  if (items.length === 0) return 0
  const sum = items.reduce((acc, f) => acc + f.rating, 0)
  return Math.round((sum / items.length) * 10) / 10
}

export async function createFeedback(
  data: Omit<FeedbackItem, 'id' | 'createdAt'>
): Promise<FeedbackItem> {
  return api.post<FeedbackItem>('/api/feedback', data)
}

export async function deleteFeedback(id: string): Promise<void> {
  await api.delete(`/api/feedback/${id}`)
}
