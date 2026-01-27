import { api } from '@/lib/api'
import type { AgentConfig } from '@/types'

export async function getAllAgents(): Promise<AgentConfig[]> {
  return api.get<AgentConfig[]>('/api/agents')
}

export async function getAgentById(id: string): Promise<AgentConfig> {
  return api.get<AgentConfig>(`/api/agents/${id}`)
}

export async function createAgent(
  data: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt' | 'knowledgeBaseFiles'>
): Promise<AgentConfig> {
  return api.post<AgentConfig>('/api/agents', data)
}

export async function updateAgent(
  id: string,
  data: Partial<Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt' | 'knowledgeBaseFiles'>>
): Promise<AgentConfig> {
  return api.put<AgentConfig>(`/api/agents/${id}`, data)
}

export async function deleteAgent(id: string): Promise<void> {
  await api.delete(`/api/agents/${id}`)
}

export async function isAgentUsedInWorkflows(agentId: string): Promise<boolean> {
  const data = await api.get<{ inUse: boolean }>(`/api/agents/${agentId}/in-use`)
  return data.inUse
}
