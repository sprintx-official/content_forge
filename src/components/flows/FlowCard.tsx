import { Link } from 'react-router-dom'
import type { AnyFlow } from '../../types'
import { FLOW_TYPE_COLORS } from '../../constants/systemFlows'
import { Brain, MessageSquare, Image as ImageIcon, Video, Newspaper } from 'lucide-react'

interface FlowCardProps {
  flow: AnyFlow
}

export function FlowCard({ flow }: FlowCardProps) {
  const typeIcon = {
    text: Brain,
    chat: MessageSquare,
    image: ImageIcon,
    video: Video,
    news: Newspaper,
  }[flow.type]

  const TypeIcon = typeIcon

  return (
    <Link
      to={`/flows/${flow.id}`}
      className="block h-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:bg-white/10 transition-all hover:border-white/20"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="rounded p-2 flex-shrink-0"
          style={{ backgroundColor: FLOW_TYPE_COLORS[flow.type] + '20' }}
        >
          <TypeIcon size={24} style={{ color: FLOW_TYPE_COLORS[flow.type] }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{flow.name}</h3>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span
              className="inline-block px-2 py-1 text-xs rounded font-medium whitespace-nowrap"
              style={{
                backgroundColor: FLOW_TYPE_COLORS[flow.type] + '30',
                color: FLOW_TYPE_COLORS[flow.type],
              }}
            >
              {flow.type}
            </span>
            <span className="inline-block px-2 py-1 text-xs rounded font-medium bg-white/10 text-white/70">
              {flow.mode}
            </span>
            {'isSystem' in flow && flow.isSystem && (
              <span className="inline-block px-2 py-1 text-xs rounded font-medium bg-white/10 text-white/50">
                system
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-400 line-clamp-2">{flow.description}</p>
    </Link>
  )
}
