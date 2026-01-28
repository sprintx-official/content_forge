import { create } from 'zustand'
import type { User, UserRole, AgentConfig, Workflow, ApiKeyConfig, AiProvider, ModelPricing } from '@/types'
import * as teamService from '@/services/teamService'
import * as agentService from '@/services/agentService'
import * as workflowService from '@/services/workflowService'
import * as apiKeyService from '@/services/apiKeyService'
import * as pricingService from '@/services/pricingService'

type AdminTab = 'team' | 'agents' | 'workflows' | 'api-keys' | 'pricing'

interface AdminState {
  activeTab: AdminTab
  loading: boolean
  teamMembers: User[]
  agents: AgentConfig[]
  workflows: Workflow[]
  apiKeys: ApiKeyConfig[]
  modelPricing: ModelPricing[]

  setActiveTab: (tab: AdminTab) => void

  // Team actions
  loadTeam: () => Promise<void>
  addMember: (name: string, email: string, password: string, role: UserRole) => Promise<User | null>
  changeRole: (userId: string, newRole: UserRole) => Promise<boolean>
  removeMember: (userId: string) => Promise<boolean>

  // Agent actions
  loadAgents: () => Promise<void>
  addAgent: (data: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt' | 'knowledgeBaseFiles'>) => Promise<AgentConfig>
  editAgent: (id: string, data: Partial<Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt' | 'knowledgeBaseFiles'>>) => Promise<AgentConfig | null>
  deleteAgent: (id: string) => Promise<boolean>
  isAgentInUse: (agentId: string) => Promise<boolean>

  // Workflow actions
  loadWorkflows: () => Promise<void>
  addWorkflow: (data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Workflow>
  editWorkflow: (id: string, data: Partial<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Workflow | null>
  deleteWorkflow: (id: string) => Promise<boolean>
  toggleWorkflow: (id: string) => Promise<Workflow | null>
  setWorkflowAccess: (workflowId: string, userIds: string[]) => Promise<void>

  // API Key actions
  loadApiKeys: () => Promise<void>
  saveApiKey: (provider: AiProvider, apiKey: string) => Promise<ApiKeyConfig | null>
  deleteApiKey: (provider: AiProvider) => Promise<boolean>

  // Pricing actions
  loadPricing: () => Promise<void>
  savePricing: (data: Omit<ModelPricing, 'id' | 'updatedAt'>) => Promise<ModelPricing | null>
  updatePricing: (id: string, data: Partial<Omit<ModelPricing, 'id' | 'updatedAt'>>) => Promise<ModelPricing | null>
  deletePricing: (id: string) => Promise<boolean>
}

export const useAdminStore = create<AdminState>((set, get) => ({
  activeTab: 'team',
  loading: false,
  teamMembers: [],
  agents: [],
  workflows: [],
  apiKeys: [],
  modelPricing: [],

  setActiveTab: (tab) => set({ activeTab: tab }),

  // Team
  loadTeam: async () => {
    set({ loading: true })
    try {
      const members = await teamService.getAllMembers()
      set({ teamMembers: members })
    } finally {
      set({ loading: false })
    }
  },

  addMember: async (name, email, password, role) => {
    try {
      const member = await teamService.createMember(name, email, password, role)
      await get().loadTeam()
      return member
    } catch {
      return null
    }
  },

  changeRole: async (userId, newRole) => {
    try {
      await teamService.changeRole(userId, newRole)
      await get().loadTeam()
      return true
    } catch {
      return false
    }
  },

  removeMember: async (userId) => {
    try {
      await teamService.removeMember(userId)
      await get().loadTeam()
      return true
    } catch {
      return false
    }
  },

  // Agents
  loadAgents: async () => {
    set({ loading: true })
    try {
      const agents = await agentService.getAllAgents()
      set({ agents })
    } finally {
      set({ loading: false })
    }
  },

  addAgent: async (data) => {
    const agent = await agentService.createAgent(data)
    await get().loadAgents()
    return agent
  },

  editAgent: async (id, data) => {
    try {
      const agent = await agentService.updateAgent(id, data)
      await get().loadAgents()
      return agent
    } catch {
      return null
    }
  },

  deleteAgent: async (id) => {
    try {
      await agentService.deleteAgent(id)
      await get().loadAgents()
      return true
    } catch {
      return false
    }
  },

  isAgentInUse: async (agentId) => {
    return agentService.isAgentUsedInWorkflows(agentId)
  },

  // Workflows
  loadWorkflows: async () => {
    set({ loading: true })
    try {
      const workflows = await workflowService.getAllWorkflows()
      set({ workflows })
    } finally {
      set({ loading: false })
    }
  },

  addWorkflow: async (data) => {
    const workflow = await workflowService.createWorkflow(data)
    await get().loadWorkflows()
    return workflow
  },

  editWorkflow: async (id, data) => {
    try {
      const workflow = await workflowService.updateWorkflow(id, data)
      await get().loadWorkflows()
      return workflow
    } catch {
      return null
    }
  },

  deleteWorkflow: async (id) => {
    try {
      await workflowService.deleteWorkflow(id)
      await get().loadWorkflows()
      return true
    } catch {
      return false
    }
  },

  toggleWorkflow: async (id) => {
    try {
      const workflow = await workflowService.toggleWorkflowActive(id)
      await get().loadWorkflows()
      return workflow
    } catch {
      return null
    }
  },

  setWorkflowAccess: async (workflowId, userIds) => {
    await workflowService.setWorkflowAccess(workflowId, userIds)
    await get().loadWorkflows()
  },

  // API Keys
  loadApiKeys: async () => {
    set({ loading: true })
    try {
      const apiKeys = await apiKeyService.getApiKeys()
      set({ apiKeys })
    } finally {
      set({ loading: false })
    }
  },

  saveApiKey: async (provider, apiKey) => {
    const key = await apiKeyService.saveApiKey(provider, apiKey)
    await get().loadApiKeys()
    return key
  },

  deleteApiKey: async (provider) => {
    try {
      await apiKeyService.deleteApiKey(provider)
      await get().loadApiKeys()
      return true
    } catch {
      return false
    }
  },

  // Pricing
  loadPricing: async () => {
    set({ loading: true })
    try {
      const pricing = await pricingService.getAllPricing()
      set({ modelPricing: pricing })
    } finally {
      set({ loading: false })
    }
  },

  savePricing: async (data) => {
    try {
      const pricing = await pricingService.createPricing(data)
      await get().loadPricing()
      return pricing
    } catch {
      return null
    }
  },

  updatePricing: async (id, data) => {
    try {
      const pricing = await pricingService.updatePricing(id, data)
      await get().loadPricing()
      return pricing
    } catch {
      return null
    }
  },

  deletePricing: async (id) => {
    try {
      await pricingService.deletePricing(id)
      await get().loadPricing()
      return true
    } catch {
      return false
    }
  },
}))
