import { api } from '@/lib/api'
import type { AgentMemoryItem } from '@/types'

export async function getMemoryByAgentId(agentId: string, limit = 20): Promise<AgentMemoryItem[]> {
  return api.get<AgentMemoryItem[]>(`/api/memory/agent/${agentId}?limit=${limit}`)
}

export async function deleteMemoryEntry(id: string): Promise<void> {
  await api.delete(`/api/memory/${id}`)
}

export async function clearAgentMemory(agentId: string): Promise<void> {
  await api.delete(`/api/memory/agent/${agentId}`)
}
