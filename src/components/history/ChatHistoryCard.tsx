import { Trash2, Eye, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatConversation } from '@/types'

interface ChatHistoryCardProps {
  conversation: ChatConversation
  onDelete: (id: string) => void
  onView: (conversation: ChatConversation) => void
}

export default function ChatHistoryCard({ conversation, onDelete, onView }: ChatHistoryCardProps) {
  const formattedDate = new Date(conversation.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this conversation? This cannot be undone.')
    if (confirmed) onDelete(conversation.id)
  }

  return (
    <div
      className={cn(
        'bg-white/5 border border-white/10 rounded-xl p-5',
        'hover:border-white/20 transition-all relative group cursor-pointer',
      )}
      onClick={() => onView(conversation)}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={cn(
          'absolute top-4 right-4',
          'text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100',
          'transition-opacity cursor-pointer',
        )}
        aria-label="Delete conversation"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Top row: type badge + date */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
          Chat
        </span>
        <span className="text-xs text-[#6b7280]">{formattedDate}</span>
      </div>

      {/* Title */}
      <p className="text-[#f9fafb] font-medium line-clamp-2 mb-3 pr-6">
        {conversation.title}
      </p>

      {/* Last message preview */}
      {conversation.lastMessage && (
        <p className="text-sm text-[#9ca3af] line-clamp-2 mb-4 leading-relaxed">
          {conversation.lastMessage}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-[#9ca3af]">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {conversation.messageCount} messages
          </span>
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
