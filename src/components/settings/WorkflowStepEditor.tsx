import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { AgentConfig, WorkflowStep } from '@/types'

interface WorkflowStepEditorProps {
  step: WorkflowStep
  index: number
  total: number
  agents: AgentConfig[]
  onChange: (index: number, step: WorkflowStep) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export default function WorkflowStepEditor({
  step,
  index,
  total,
  agents,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: WorkflowStepEditorProps) {
  const agentOptions = agents.map((a) => ({
    value: a.id,
    label: a.name,
  }))

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-col items-center gap-1 pt-6">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
          className="text-[#cbd5e1] hover:text-[#f8fafc] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <span className="text-xs text-[#94a3b8] font-mono">{index + 1}</span>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMoveDown(index)}
          className="text-[#cbd5e1] hover:text-[#f8fafc] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Agent"
            value={step.agentId}
            onChange={(val) => onChange(index, { ...step, agentId: val })}
            options={agentOptions}
            placeholder="Select agent..."
          />
          <Input
            label="Description"
            value={step.instructions}
            onChange={(e) => onChange(index, { ...step, instructions: e.target.value })}
            placeholder="Describe what this step does"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="mt-6 text-red-400 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
