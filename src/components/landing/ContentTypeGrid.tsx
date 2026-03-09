import { useNavigate } from 'react-router-dom'
import {
  FileText,
  PenTool,
  Share2,
  Newspaper,
  Film,
  Megaphone,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'

// Map the string icon names stored in content type options to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  PenTool,
  Share2,
  Newspaper,
  Film,
  Megaphone,
}

export default function ContentTypeGrid() {
  const navigate = useNavigate()
  const contentTypes = useForgeOptionsStore((s) => s.contentTypes)

  if (contentTypes.length === 0) return null

  return (
    <section className="px-4 max-w-6xl mx-auto">
      {/* Section heading */}
      <h2
        className={cn(
          'text-3xl md:text-5xl font-bold text-center mb-12',
          'bg-gradient-to-r from-[#10b981] to-[#6366f1] bg-clip-text text-transparent',
        )}
      >
        What Will You Create?
      </h2>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentTypes.map((type) => {
          const Icon = ICON_MAP[type.icon] ?? FileText

          return (
            <button
              key={type.id}
              onClick={() => {
                const flowMap: Record<string, string> = {
                  text: 'system-write',
                  chat: 'system-chat',
                  image: 'system-image',
                  video: 'system-video',
                }
                const flowId = flowMap[type.id] || 'system-write'
                navigate(`/flows/${flowId}`)
              }}
              className={cn(
                'group text-left',
                'bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6',
                'hover:border-[#10b981] hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]',
                'hover:scale-[1.03] transition-all duration-300',
                'cursor-pointer',
              )}
            >
              <Icon className="h-8 w-8 text-[#10b981] mb-4 transition-transform duration-300 group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {type.name}
              </h3>
              <p className="text-sm text-[#cbd5e1] leading-relaxed">
                {type.description}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
