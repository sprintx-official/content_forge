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
        <label className="block text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-3">
          Target Audience
        </label>
        <div className="text-sm text-[#6b7280]">Loading audiences...</div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-3">
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
                isSelected && 'border-[#f472b6] bg-[#f472b6]/10 text-[#f472b6]'
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
