import { cn } from '@/lib/utils'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'
import { useForgeStore } from '@/stores/useForgeStore'
import type { Audience } from '@/types'

export default function AudienceSelector() {
  const audience = useForgeStore((s) => s.input.audience)
  const setAudience = useForgeStore((s) => s.setAudience)
  const audiences = useForgeOptionsStore((s) => s.audiences)

  if (audiences.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-[#cbd5e1] uppercase tracking-wider mb-3">
          Target Audience
        </label>
        <div className="text-sm text-[#94a3b8]">Loading audiences...</div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[#cbd5e1] uppercase tracking-wider mb-3">
        Target Audience
      </label>
      <div className="flex flex-wrap gap-2">
        {audiences.map((a) => {
          const isSelected = audience === a.id

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id as Audience)}
              className={cn(
                'px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 cursor-pointer transition-all',
                'hover:bg-white/10 hover:border-white/20 text-[#d1d5db]',
                isSelected && 'border-[#ec4899] bg-[#ec4899]/10 text-[#ec4899]'
              )}
            >
              {a.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
