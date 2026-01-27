import { FileText, PenTool, Share2, Newspaper, Film, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTENT_TYPES } from '@/constants'
import { useForgeStore } from '@/stores/useForgeStore'
import type { ContentType } from '@/types'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  FileText,
  PenTool,
  Share2,
  Newspaper,
  Film,
  Megaphone,
}

export default function ContentTypeSelector() {
  const contentType = useForgeStore((s) => s.input.contentType)
  const setContentType = useForgeStore((s) => s.setContentType)

  return (
    <div>
      <label className="block text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-3">
        Content Type
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CONTENT_TYPES.map((type) => {
          const Icon = iconMap[type.icon]
          const isSelected = contentType === type.id

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setContentType(type.id as ContentType)}
              className={cn(
                'bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer transition-all text-left',
                'hover:bg-white/10 hover:border-white/20',
                isSelected &&
                  'border-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'w-5 h-5 mb-2 text-[#6b7280] transition-colors',
                    isSelected && 'text-[#00f0ff]'
                  )}
                />
              )}
              <div
                className={cn(
                  'text-sm font-semibold text-white transition-colors',
                  isSelected && 'text-[#00f0ff]'
                )}
              >
                {type.name}
              </div>
              <div className="text-xs text-[#6b7280] mt-1 line-clamp-2">
                {type.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
