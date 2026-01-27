import { cn } from '@/lib/utils'
import { LENGTHS } from '@/constants'
import { useForgeStore } from '@/stores/useForgeStore'
import type { ContentLength } from '@/types'

export default function LengthSelector() {
  const length = useForgeStore((s) => s.input.length)
  const customWordCount = useForgeStore((s) => s.input.customWordCount)
  const tolerancePercent = useForgeStore((s) => s.input.tolerancePercent)
  const setLength = useForgeStore((s) => s.setLength)
  const setInput = useForgeStore((s) => s.setInput)

  return (
    <div>
      <label className="block text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-3">
        Content Length
      </label>
      <div className="bg-white/5 rounded-xl border border-white/10 p-1 flex">
        {LENGTHS.map((l) => {
          const isSelected = length === l.id

          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setLength(l.id as ContentLength)}
              className={cn(
                'flex-1 py-3 px-4 rounded-lg text-center cursor-pointer transition-all',
                'text-[#d1d5db] hover:bg-white/5',
                isSelected &&
                  'bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/30'
              )}
            >
              <div className="text-sm font-semibold">{l.name}</div>
              {l.id !== 'custom' && (
                <div
                  className={cn(
                    'text-xs mt-0.5',
                    isSelected ? 'text-[#34d399]/70' : 'text-[#6b7280]'
                  )}
                >
                  ~{l.words} words
                </div>
              )}
            </button>
          )
        })}
      </div>

      {length === 'custom' && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
              Word Count
            </label>
            <input
              type="number"
              min={50}
              max={5000}
              value={customWordCount ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Math.max(50, Math.min(5000, Number(e.target.value)))
                setInput({ customWordCount: val })
              }}
              placeholder="e.g. 750"
              className={cn(
                'w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-[#f9fafb]',
                'focus:outline-none focus:border-[#00f0ff]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#00f0ff]/30',
                'placeholder:text-[#6b7280]',
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
              Tolerance (±%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={tolerancePercent ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Math.max(0, Math.min(50, Number(e.target.value)))
                setInput({ tolerancePercent: val })
              }}
              placeholder="e.g. 10"
              className={cn(
                'w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-[#f9fafb]',
                'focus:outline-none focus:border-[#00f0ff]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#00f0ff]/30',
                'placeholder:text-[#6b7280]',
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}
