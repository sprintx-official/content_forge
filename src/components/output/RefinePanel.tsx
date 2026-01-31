import { Wand2, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONES, AUDIENCES } from '@/constants'
import type { Tone, Audience } from '@/types'

interface RefinePanelProps {
  currentTone: Tone
  currentAudience: Audience
  refineTone: Tone
  refineAudience: Audience
  isRefining: boolean
  onToneChange: (tone: Tone) => void
  onAudienceChange: (audience: Audience) => void
  onApply: () => void
  onCancel: () => void
}

export default function RefinePanel({
  currentTone,
  currentAudience,
  refineTone,
  refineAudience,
  isRefining,
  onToneChange,
  onAudienceChange,
  onApply,
  onCancel,
}: RefinePanelProps) {
  const toneChanged = refineTone !== currentTone
  const audienceChanged = refineAudience !== currentAudience
  const hasChanges = toneChanged || audienceChanged

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-[#a855f7]/30 rounded-2xl p-5 animate-[slideUp_0.3s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-[#a855f7]" />
          <h3 className="text-lg font-semibold text-[#f9fafb]">Refine Content</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-[#6b7280] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-[#9ca3af] mb-4">
        Adjust the tone or audience and the AI will refine your content to match.
        You&apos;ll see a diff preview before accepting changes.
      </p>

      {/* Tone selector */}
      <div className="mb-4">
        <label className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2 block">
          Tone {toneChanged && <span className="text-[#a855f7] normal-case">(changed)</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onToneChange(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer',
                'border',
                refineTone === t.id
                  ? 'border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7]'
                  : 'border-white/10 text-[#9ca3af] hover:bg-white/10 hover:border-white/20',
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Audience selector */}
      <div className="mb-5">
        <label className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2 block">
          Audience {audienceChanged && <span className="text-[#f472b6] normal-case">(changed)</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAudienceChange(a.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer',
                'border',
                refineAudience === a.id
                  ? 'border-[#f472b6] bg-[#f472b6]/10 text-[#f472b6]'
                  : 'border-white/10 text-[#9ca3af] hover:bg-white/10 hover:border-white/20',
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onApply}
          disabled={!hasChanges || isRefining}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
            hasChanges && !isRefining
              ? 'bg-[#00f0ff] text-[#0a0e1a] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]'
              : 'bg-white/10 text-[#6b7280] cursor-not-allowed',
          )}
        >
          {isRefining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Refining...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Apply Refinement
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isRefining}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#9ca3af] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
