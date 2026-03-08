import { cn } from '@/lib/utils'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'
import { useForgeStore } from '@/stores/useForgeStore'
import type { Tone } from '@/types'

export default function ToneSelector() {
  const tone = useForgeStore((s) => s.input.tone)
  const setTone = useForgeStore((s) => s.setTone)
  const tones = useForgeOptionsStore((s) => s.tones)

  if (tones.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-[#cbd5e1] uppercase tracking-wider mb-3">
          Tone
        </label>
        <div className="text-sm text-[#94a3b8]">Loading tones...</div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[#cbd5e1] uppercase tracking-wider mb-3">
        Tone
      </label>
      <div className="flex flex-wrap gap-2">
        {tones.map((t) => {
          const isSelected = tone === t.id

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id as Tone)}
              className={cn(
                'px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 cursor-pointer transition-all',
                'hover:bg-white/10 hover:border-white/20 text-[#d1d5db]',
                isSelected && 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]'
              )}
            >
              {t.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
