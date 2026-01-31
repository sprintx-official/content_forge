import { Languages, Minimize2, HelpCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  onAction: (prompt: string) => void
  disabled?: boolean
}

const ACTIONS = [
  { label: 'Translate', icon: Languages, prompt: 'Translate the content above to Spanish.' },
  { label: 'Summarize', icon: FileText, prompt: 'Summarize the content above in 2-3 sentences.' },
  { label: 'Make Shorter', icon: Minimize2, prompt: 'Rewrite the content above to be more concise, keeping the key points.' },
  { label: 'Explain', icon: HelpCircle, prompt: 'Explain the main points of the content above in simple terms.' },
]

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none">
      {ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            onClick={() => onAction(action.prompt)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all',
              'bg-white/[0.04] border border-white/[0.08] text-white/40',
              'hover:bg-[#00f0ff]/10 hover:border-[#00f0ff]/20 hover:text-[#00f0ff]/70',
              'disabled:opacity-30 disabled:cursor-not-allowed',
            )}
          >
            <Icon className="w-3 h-3" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
