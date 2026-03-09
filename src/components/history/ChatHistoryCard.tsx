import { useState } from 'react'
import { Trash2, Eye, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatConversation } from '@/types'

interface ChatHistoryCardProps {
  conversation: ChatConversation
  onDelete: (id: string) => void
  onView: (conversation: ChatConversation) => void
}

export default function ChatHistoryCard({ conversation, onDelete, onView }: ChatHistoryCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const formattedDate = new Date(conversation.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={cn(
        'bg-white/5 border border-white/10 rounded-xl p-5',
        'hover:border-white/20 transition-all relative group cursor-pointer',
      )}
      onClick={() => onView(conversation)}
    >
      {/* Delete button */}
      {confirmingDelete ? (
        <span
          className="absolute top-4 right-4 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setConfirmingDelete(false); onDelete(conversation.id) }}
            className="px-2 py-0.5 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="px-2 py-0.5 text-xs rounded bg-white/5 text-[#cbd5e1] border border-white/10 hover:bg-white/10"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmingDelete(true) }}
          className={cn(
            'absolute top-4 right-4',
            'text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100',
            'transition-opacity cursor-pointer',
          )}
          aria-label="Delete conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {/* Top row: type badge + date */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
          Chat
        </span>
        <span className="text-xs text-[#94a3b8]">{formattedDate}</span>
      </div>

      {/* Title */}
      <p className="text-[#f8fafc] font-medium line-clamp-2 mb-3 pr-6">
        {conversation.title}
      </p>

      {/* Last message preview */}
      {conversation.lastMessage && (
        <p className="text-sm text-[#cbd5e1] line-clamp-2 mb-4 leading-relaxed">
          {conversation.lastMessage}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-[#cbd5e1]">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {conversation.messageCount} messages
          </span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs text-[#10b981]',
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
