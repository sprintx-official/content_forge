import { ArrowUp, ArrowDown, Trash2, PenTool, ImageIcon, Code2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AgentConfig, WorkflowStep, WorkflowStepType } from '@/types'

const STEP_TYPES: { id: WorkflowStepType; label: string; icon: typeof PenTool; description: string }[] = [
  { id: 'text', label: 'Text', icon: PenTool, description: 'Generate text content' },
  { id: 'image', label: 'Image', icon: ImageIcon, description: 'Generate an image from context' },
  { id: 'code', label: 'Code', icon: Code2, description: 'Generate code' },
]

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

  const currentType = step.stepType || 'text'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-col items-center gap-1 pt-6">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
          className="text-[#9ca3af] hover:text-[#f9fafb] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <span className="text-xs text-[#6b7280] font-mono">{index + 1}</span>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMoveDown(index)}
          className="text-[#9ca3af] hover:text-[#f9fafb] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3">
        {/* Step type selector */}
        <div className="flex items-center gap-1.5">
          {STEP_TYPES.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(index, { ...step, stepType: t.id })}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  currentType === t.id
                    ? 'bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff]'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60',
                )}
                title={t.description}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            )
          })}
        </div>

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
            placeholder={
              currentType === 'image'
                ? 'Image will be generated from previous output'
                : currentType === 'code'
                  ? 'Describe the code to generate'
                  : 'Describe what this step does'
            }
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
