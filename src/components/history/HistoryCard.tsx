import {
  Trash2,
  Eye,
  Clock,
  BarChart3,
  FileText,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HistoryItem } from '@/types'

interface HistoryCardProps {
  item: HistoryItem
  onDelete: (id: string) => void
  onView: (item: HistoryItem) => void
}

const TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-500/20 text-blue-400',
  blog: 'bg-green-500/20 text-green-400',
  social: 'bg-pink-500/20 text-pink-400',
  press: 'bg-amber-500/20 text-amber-400',
  script: 'bg-violet-500/20 text-violet-400',
  'ad-copy': 'bg-orange-500/20 text-orange-400',
}

export default function HistoryCard({ item, onDelete, onView }: HistoryCardProps) {
  const { input, output, createdAt } = item
  const { metrics } = output

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this content? This cannot be undone.')
    if (confirmed) onDelete(item.id)
  }

  return (
    <div
      className={cn(
        'bg-white/5 border border-white/10 rounded-xl p-5',
        'hover:border-white/20 transition-all relative group cursor-pointer',
      )}
      onClick={() => onView(item)}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={cn(
          'absolute top-4 right-4',
          'text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100',
          'transition-opacity cursor-pointer',
        )}
        aria-label="Delete item"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Top row: type badge + workflow badge + date */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={cn(
            'text-xs font-medium px-2.5 py-0.5 rounded-full capitalize',
            TYPE_COLORS[input.contentType] ?? 'bg-white/10 text-white/60',
          )}
        >
          {input.contentType}
        </span>
        {item.workflowName && (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#a855f7]/20 text-[#a855f7]">
            {item.workflowName}
          </span>
        )}
        <span className="text-xs text-[#6b7280]">{formattedDate}</span>
      </div>

      {/* Topic */}
      <p className="text-[#f9fafb] font-medium line-clamp-2 mb-3 pr-6">
        {input.topic}
      </p>

      {/* Content preview */}
      <p className="text-sm text-[#9ca3af] line-clamp-2 mb-4 leading-relaxed">
        {output.content}
      </p>

      {/* Bottom row: metrics + view button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-[#9ca3af]">
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {metrics.wordCount} words
          </span>
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            {metrics.readabilityScore}/100
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {metrics.readTimeMinutes} min read
          </span>
          {output.tokenUsage && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <DollarSign className="h-3.5 w-3.5" />
              ${output.tokenUsage.costUsd.toFixed(4)}
            </span>
          )}
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs text-[#00f0ff]',
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </span>
      </div>
    </div>
  )
}
