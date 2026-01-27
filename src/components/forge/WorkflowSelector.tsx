import { useEffect, useState } from 'react'
import { GitBranch, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActiveWorkflows } from '@/services/workflowService'
import { useForgeStore } from '@/stores/useForgeStore'
import type { Workflow } from '@/types'

export default function WorkflowSelector() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const selectedWorkflow = useForgeStore((s) => s.selectedWorkflow)
  const setWorkflow = useForgeStore((s) => s.setWorkflow)

  useEffect(() => {
    getActiveWorkflows().then(setWorkflows)
  }, [])

  if (workflows.length === 0) return null

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-[#9ca3af]">Workflow</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Classic option (no workflow) */}
        <button
          type="button"
          onClick={() => setWorkflow(null)}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200',
            !selectedWorkflow
              ? 'border-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              : 'border-white/10 bg-white/5 hover:border-white/20',
          )}
        >
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            !selectedWorkflow ? 'bg-[#00f0ff]/20' : 'bg-white/10',
          )}>
            <Zap className={cn(
              'h-5 w-5',
              !selectedWorkflow ? 'text-[#00f0ff]' : 'text-[#9ca3af]',
            )} />
          </div>
          <div>
            <p className={cn(
              'text-sm font-medium',
              !selectedWorkflow ? 'text-[#00f0ff]' : 'text-[#f9fafb]',
            )}>
              Classic
            </p>
            <p className="text-xs text-[#9ca3af] mt-0.5">Default processing pipeline</p>
          </div>
        </button>

        {/* Workflow options */}
        {workflows.map((wf) => {
          const isSelected = selectedWorkflow?.id === wf.id
          return (
            <button
              key={wf.id}
              type="button"
              onClick={() => setWorkflow(wf)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200',
                isSelected
                  ? 'border-[#a855f7] bg-[#a855f7]/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                  : 'border-white/10 bg-white/5 hover:border-white/20',
              )}
            >
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                isSelected ? 'bg-[#a855f7]/20' : 'bg-white/10',
              )}>
                <GitBranch className={cn(
                  'h-5 w-5',
                  isSelected ? 'text-[#a855f7]' : 'text-[#9ca3af]',
                )} />
              </div>
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-[#a855f7]' : 'text-[#f9fafb]',
                )}>
                  {wf.name}
                </p>
                <p className="text-xs text-[#9ca3af] mt-0.5 line-clamp-1">
                  {wf.description || `${wf.steps.length} steps`}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
