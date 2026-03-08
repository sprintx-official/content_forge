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
      <label className="block text-sm font-medium text-[#cbd5e1] uppercase tracking-wider mb-3">
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
                  'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30'
              )}
            >
              <div className="text-sm font-semibold">{l.name}</div>
              {l.id !== 'custom' && (
                <div
                  className={cn(
                    'text-xs mt-0.5',
                    isSelected ? 'text-[#10b981]/70' : 'text-[#94a3b8]'
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
            <label className="block text-xs font-medium text-[#cbd5e1] mb-1.5">
              Word Count
            </label>
            <input
              type="number"
              min={10}
              max={10000}
              value={customWordCount ?? ''}
              onChange={(e) => {
                // Allow free typing - store raw value
                const rawVal = e.target.value === '' ? undefined : Number(e.target.value)
                setInput({ customWordCount: rawVal })
              }}
              onBlur={(e) => {
                // Clamp value only on blur
                if (e.target.value !== '') {
                  const val = Math.max(10, Math.min(10000, Number(e.target.value)))
                  setInput({ customWordCount: val })
                }
              }}
              placeholder="e.g. 750"
              className={cn(
                'w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-[#f8fafc]',
                'focus:outline-none focus:border-[#10b981]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#10b981]/30',
                'placeholder:text-[#94a3b8]',
              )}
            />
            <p className="text-[10px] text-[#94a3b8] mt-1">Min: 10 · Max: 10,000</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#cbd5e1] mb-1.5">
              Tolerance (±%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={tolerancePercent ?? ''}
              onChange={(e) => {
                // Allow free typing - store raw value
                const rawVal = e.target.value === '' ? undefined : Number(e.target.value)
                setInput({ tolerancePercent: rawVal })
              }}
              onBlur={(e) => {
                // Clamp value only on blur
                if (e.target.value !== '') {
                  const val = Math.max(0, Math.min(50, Number(e.target.value)))
                  setInput({ tolerancePercent: val })
                }
              }}
              placeholder="e.g. 10"
              className={cn(
                'w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-[#f8fafc]',
                'focus:outline-none focus:border-[#10b981]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#10b981]/30',
                'placeholder:text-[#94a3b8]',
              )}
            />
            <p className="text-[10px] text-[#94a3b8] mt-1">Max: 50%</p>
          </div>
        </div>
      )}
    </div>
  )
}
