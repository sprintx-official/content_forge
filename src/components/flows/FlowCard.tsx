import { Link } from 'react-router-dom'
import type { AnyFlow } from '../../types'
import { FLOW_TYPE_COLORS } from '../../constants/systemFlows'
import { Brain, MessageSquare, Image as ImageIcon, Video } from 'lucide-react'

interface FlowCardProps {
  flow: AnyFlow
}

export function FlowCard({ flow }: FlowCardProps) {
  const typeIcon = {
    text: Brain,
    chat: MessageSquare,
    image: ImageIcon,
    video: Video,
  }[flow.type]

  const TypeIcon = typeIcon

  return (
    <Link
      to={`/flows/${flow.id}`}
      className="block h-full rounded-lg border border-gray-200 bg-white p-4 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="rounded p-2"
          style={{ backgroundColor: FLOW_TYPE_COLORS[flow.type] + '20' }}
        >
          <TypeIcon size={24} style={{ color: FLOW_TYPE_COLORS[flow.type] }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{flow.name}</h3>
          <div className="flex gap-2 mt-1">
            <span
              className="inline-block px-2 py-1 text-xs rounded font-medium"
              style={{
                backgroundColor: FLOW_TYPE_COLORS[flow.type] + '30',
                color: FLOW_TYPE_COLORS[flow.type],
              }}
            >
              {flow.type}
            </span>
            <span className="inline-block px-2 py-1 text-xs rounded font-medium bg-gray-100 text-gray-700">
              {flow.mode}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600">{flow.description}</p>
    </Link>
  )
}
