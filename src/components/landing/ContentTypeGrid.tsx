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
import { CONTENT_TYPES } from '@/constants'

// Map the string icon names stored in CONTENT_TYPES to actual Lucide components
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

  return (
    <section className="px-4 max-w-6xl mx-auto">
      {/* Section heading */}
      <h2
        className={cn(
          'text-3xl md:text-5xl font-bold text-center mb-12',
          'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent',
        )}
      >
        What Will You Create?
      </h2>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONTENT_TYPES.map((type) => {
          const Icon = ICON_MAP[type.icon] ?? FileText

          return (
            <button
              key={type.id}
              onClick={() => navigate(`/forge?type=${type.id}`)}
              className={cn(
                'group text-left',
                'bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6',
                'hover:border-[#00f0ff] hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]',
                'hover:scale-[1.03] transition-all duration-300',
                'cursor-pointer',
              )}
            >
              <Icon className="h-8 w-8 text-[#00f0ff] mb-4 transition-transform duration-300 group-hover:scale-110" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {type.name}
              </h3>
              <p className="text-sm text-[#9ca3af] leading-relaxed">
                {type.description}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
