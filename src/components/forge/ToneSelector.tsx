import { cn } from '@/lib/utils'
import { TONES } from '@/constants'
import { useForgeStore } from '@/stores/useForgeStore'
import type { Tone } from '@/types'

export default function ToneSelector() {
  const tone = useForgeStore((s) => s.input.tone)
  const setTone = useForgeStore((s) => s.setTone)

  return (
    <div>
      <label className="block text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-3">
        Tone
      </label>
      <div className="flex flex-wrap gap-2">
        {TONES.map((t) => {
          const isSelected = tone === t.id

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id as Tone)}
              className={cn(
                'px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 cursor-pointer transition-all',
                'hover:bg-white/10 hover:border-white/20 text-[#d1d5db]',
                isSelected && 'border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7]'
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
