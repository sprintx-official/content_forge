import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, GitBranch, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/stores/useAdminStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import Loader from '@/components/ui/Loader'
import { useToast } from '@/components/ui/Toast'
import { getIconComponent } from './IconPicker'
import WorkflowForm from './WorkflowForm'
import type { Workflow } from '@/types'

export default function WorkflowsTab() {
  const { workflows, agents, loading, loadWorkflows, loadAgents, loadTeam, deleteWorkflow, toggleWorkflow } =
    useAdminStore()
  const { toast } = useToast()
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [creating, setCreating] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([loadWorkflows(), loadAgents(), loadTeam()]).then(() => setInitialLoad(false))
  }, [loadWorkflows, loadAgents, loadTeam])

  const handleDelete = async (workflow: Workflow) => {
    setConfirmingDeleteId(null)
    const success = await deleteWorkflow(workflow.id)
    if (success) {
      toast('success', `Workflow "${workflow.name}" deleted`)
    } else {
      toast('error', `Failed to delete "${workflow.name}"`)
    }
  }

  const getAgentName = (agentId: string) => {
    return agents.find((a) => a.id === agentId)?.name ?? 'Unknown'
  }

  const getAgentIcon = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    return agent ? agent.icon : 'Brain'
  }

  if (initialLoad && loading) {
    return <Loader label="Loading workflows..." />
  }

  if (creating || editing) {
    return (
      <WorkflowForm
        workflow={editing}
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
        New Workflow
      </Button>

      <div className="space-y-4">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className={cn(
              'rounded-xl border bg-white/5 p-5',
              workflow.isActive ? 'border-[#10b981]/20' : 'border-white/10',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6366f1]/10">
                  <GitBranch className="h-5 w-5 text-[#6366f1]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#f8fafc]">
                      {workflow.name}
                    </h4>
                    <Badge variant={workflow.isActive ? 'green' : 'outline'}>
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {(workflow.assignedUserIds?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-[#cbd5e1]">
                        <Users className="h-3 w-3" />
                        {workflow.assignedUserIds!.length} {workflow.assignedUserIds!.length === 1 ? 'user' : 'users'}
                      </span>
                    )}
                  </div>
                  {workflow.description && (
                    <p className="text-xs text-[#cbd5e1] mt-0.5">
                      {workflow.description}
                    </p>
                  )}
                </div>
              </div>

              <Toggle
                checked={workflow.isActive}
                onChange={() => toggleWorkflow(workflow.id)}
              />
            </div>

            {/* Steps preview */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {workflow.steps.map((step, i) => {
                const Icon = getIconComponent(getAgentIcon(step.agentId))
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1">
                      <Icon className="h-3.5 w-3.5 text-[#10b981]" />
                      <span className="text-xs text-[#cbd5e1]">
                        {getAgentName(step.agentId)}
                      </span>
                    </div>
                    {i < workflow.steps.length - 1 && (
                      <span className="text-[#94a3b8] text-xs">&rarr;</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(workflow)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
              {confirmingDeleteId === workflow.id ? (
                <span className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(workflow)}
                    className="px-2 py-0.5 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmingDeleteId(null)}
                    className="px-2 py-0.5 text-xs rounded bg-white/5 text-[#cbd5e1] border border-white/10 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDeleteId(workflow.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <p className="text-center text-[#cbd5e1] py-8">
          No workflows created. Build your first workflow to get started.
        </p>
      )}
    </div>
  )
}
