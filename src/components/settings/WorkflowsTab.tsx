import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/stores/useAdminStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { getIconComponent } from './IconPicker'
import WorkflowForm from './WorkflowForm'
import type { Workflow } from '@/types'

export default function WorkflowsTab() {
  const { workflows, agents, loadWorkflows, loadAgents, deleteWorkflow, toggleWorkflow } =
    useAdminStore()
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadWorkflows()
    loadAgents()
  }, [loadWorkflows, loadAgents])

  const handleDelete = async (workflow: Workflow) => {
    if (confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) {
      await deleteWorkflow(workflow.id)
    }
  }

  const getAgentName = (agentId: string) => {
    return agents.find((a) => a.id === agentId)?.name ?? 'Unknown'
  }

  const getAgentIcon = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    return agent ? agent.icon : 'Brain'
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
              workflow.isActive ? 'border-[#00f0ff]/20' : 'border-white/10',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a855f7]/10">
                  <GitBranch className="h-5 w-5 text-[#a855f7]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#f9fafb]">
                      {workflow.name}
                    </h4>
                    <Badge variant={workflow.isActive ? 'green' : 'outline'}>
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {workflow.description && (
                    <p className="text-xs text-[#9ca3af] mt-0.5">
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
                      <Icon className="h-3.5 w-3.5 text-[#00f0ff]" />
                      <span className="text-xs text-[#9ca3af]">
                        {getAgentName(step.agentId)}
                      </span>
                    </div>
                    {i < workflow.steps.length - 1 && (
                      <span className="text-[#6b7280] text-xs">&rarr;</span>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(workflow)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <p className="text-center text-[#9ca3af] py-8">
          No workflows created. Build your first workflow to get started.
        </p>
      )}
    </div>
  )
}
