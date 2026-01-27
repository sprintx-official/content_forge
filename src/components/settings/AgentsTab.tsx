import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, FileText, Star, MessageSquare, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/stores/useAdminStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Loader from '@/components/ui/Loader'
import { getIconComponent } from './IconPicker'
import AgentForm from './AgentForm'
import AgentFeedbackPanel from './AgentFeedbackPanel'
import AgentMemoryPanel from './AgentMemoryPanel'
import * as feedbackService from '@/services/feedbackService'
import type { AgentConfig } from '@/types'

interface AgentFeedbackInfo {
  count: number
  avg: number
}

export default function AgentsTab() {
  const { agents, loading, loadAgents, deleteAgent, isAgentInUse } = useAdminStore()
  const [editing, setEditing] = useState<AgentConfig | null>(null)
  const [creating, setCreating] = useState(false)
  const [viewingFeedback, setViewingFeedback] = useState<AgentConfig | null>(null)
  const [viewingMemory, setViewingMemory] = useState<AgentConfig | null>(null)
  const [feedbackInfo, setFeedbackInfo] = useState<Record<string, AgentFeedbackInfo>>({})
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    loadAgents().then(() => setInitialLoad(false))
  }, [loadAgents])

  useEffect(() => {
    const loadFeedbackInfo = async () => {
      const info: Record<string, AgentFeedbackInfo> = {}
      for (const agent of agents) {
        const [count, avg] = await Promise.all([
          feedbackService.getFeedbackCountByAgentId(agent.id),
          feedbackService.getAverageRatingByAgentId(agent.id),
        ])
        info[agent.id] = { count, avg }
      }
      setFeedbackInfo(info)
    }
    if (agents.length > 0) {
      loadFeedbackInfo()
    }
  }, [agents])

  const handleDelete = async (agent: AgentConfig) => {
    const inUse = await isAgentInUse(agent.id)
    if (inUse) {
      alert(`"${agent.name}" is used in a workflow and cannot be deleted.`)
      return
    }
    if (confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) {
      await deleteAgent(agent.id)
    }
  }

  if (initialLoad && loading) {
    return <Loader label="Loading agents..." />
  }

  if (viewingFeedback) {
    return (
      <AgentFeedbackPanel
        agentId={viewingFeedback.id}
        agentName={viewingFeedback.name}
        onClose={() => setViewingFeedback(null)}
      />
    )
  }

  if (viewingMemory) {
    return (
      <AgentMemoryPanel
        agentId={viewingMemory.id}
        agentName={viewingMemory.name}
        onClose={() => setViewingMemory(null)}
      />
    )
  }

  if (creating || editing) {
    return (
      <AgentForm
        agent={editing}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="default" size="md" onClick={() => setCreating(true)}>
        <Plus className="h-4 w-4" />
        New Agent
      </Button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {agents.map((agent) => {
          const Icon = getIconComponent(agent.icon)
          const fileCount = (agent.knowledgeBaseFiles ?? []).length
          const fb = feedbackInfo[agent.id]

          return (
            <div
              key={agent.id}
              className={cn(
                'group relative rounded-xl border border-white/10 bg-white/5 p-5',
                'hover:border-[#00f0ff]/20 transition-all',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00f0ff]/10">
                  <Icon className="h-5 w-5 text-[#00f0ff]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-[#f9fafb]">{agent.name}</h4>
                  <p className="text-xs text-[#9ca3af] mt-0.5 line-clamp-2">{agent.description}</p>
                </div>
              </div>

              {agent.systemPrompt && (
                <p className="mt-3 text-xs text-[#6b7280] line-clamp-2 italic">
                  {agent.systemPrompt}
                </p>
              )}

              {/* Indicators */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {fileCount > 0 && (
                  <Badge variant="outline">
                    <FileText className="mr-1 h-3 w-3" />
                    {fileCount} file{fileCount !== 1 ? 's' : ''} attached
                  </Badge>
                )}
                {fb && fb.count > 0 && (
                  <Badge variant="purple">
                    <Star className="mr-1 h-3 w-3 text-yellow-400" fill="currentColor" />
                    {fb.avg} ({fb.count})
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(agent)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingFeedback(agent)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Feedback
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingMemory(agent)}
                >
                  <Brain className="h-3.5 w-3.5" />
                  Memory
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(agent)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {agents.length === 0 && (
        <p className="text-center text-[#9ca3af] py-8">
          No agents configured. Create your first agent to get started.
        </p>
      )}
    </div>
  )
}
