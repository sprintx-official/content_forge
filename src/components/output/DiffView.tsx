import { useMemo } from 'react'
import { diffWords, type Change } from 'diff'
import { Check, X, GitCompareArrows } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiffViewProps {
  original: string
  refined: string
  onAccept: () => void
  onReject: () => void
}

export default function DiffView({ original, refined, onAccept, onReject }: DiffViewProps) {
  const changes: Change[] = useMemo(
    () => diffWords(original, refined),
    [original, refined],
  )

  const addedCount = changes.filter((c) => c.added).length
  const removedCount = changes.filter((c) => c.removed).length

  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden',
        'animate-[fadeIn_0.4s_ease-out_both]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <GitCompareArrows className="w-5 h-5 text-[#a855f7]" />
          <span className="text-sm font-semibold text-[#f9fafb]">Review Changes</span>
          <div className="flex items-center gap-2 ml-2">
            {removedCount > 0 && (
              <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                {removedCount} removed
              </span>
            )}
            {addedCount > 0 && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                {addedCount} added
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReject}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
              'border border-white/10 text-[#9ca3af] hover:text-white hover:bg-white/10',
            )}
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
              'bg-[#00f0ff] text-[#0a0e1a] hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]',
            )}
          >
            <Check className="w-3.5 h-3.5" />
            Accept Changes
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div
        className={cn(
          'px-6 py-5 md:px-8 md:py-6 max-h-[60vh] overflow-y-auto leading-relaxed text-base md:text-lg',
          '[&::-webkit-scrollbar]:w-1.5',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:hover:bg-white/20',
        )}
      >
        {changes.map((change, i) => (
          <span
            key={i}
            className={cn(
              change.added && 'bg-emerald-500/20 text-emerald-300 rounded-sm px-0.5',
              change.removed && 'bg-red-500/20 text-red-400 line-through rounded-sm px-0.5',
              !change.added && !change.removed && 'text-[#f9fafb]',
            )}
          >
            {change.value}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
