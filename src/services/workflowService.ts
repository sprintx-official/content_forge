import { api } from '@/lib/api'
import type { Workflow, WorkflowStep } from '@/types'

export async function getAllWorkflows(): Promise<Workflow[]> {
  return api.get<Workflow[]>('/api/workflows')
}

export async function getActiveWorkflows(): Promise<Workflow[]> {
  const all = await getAllWorkflows()
  return all.filter((w) => w.isActive)
}

export async function getWorkflowById(id: string): Promise<Workflow> {
  return api.get<Workflow>(`/api/workflows/${id}`)
}

export async function createWorkflow(
  data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Workflow> {
  return api.post<Workflow>('/api/workflows', data)
}

export async function updateWorkflow(
  id: string,
  data: Partial<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Workflow> {
  return api.put<Workflow>(`/api/workflows/${id}`, data)
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api.delete(`/api/workflows/${id}`)
}

export async function toggleWorkflowActive(id: string): Promise<Workflow> {
  return api.patch<Workflow>(`/api/workflows/${id}/toggle`)
}

export function buildStagesFromWorkflow(
  steps: WorkflowStep[],
  agents: { id: string; name: string }[]
): { id: string; label: string; agent: string; status: 'pending'; message: string }[] {
  return steps.map((step, index) => {
    const agent = agents.find((a) => a.id === step.agentId)
    const agentName = agent?.name ?? 'Unknown Agent'
    return {
      id: `step-${index}`,
      label: agentName,
      agent: agentName,
      status: 'pending' as const,
      message: step.instructions,
    }
  })
}
