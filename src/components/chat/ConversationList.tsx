import { useState } from 'react'
import { Plus, Trash2, Search, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatConversation } from '@/types'

interface ConversationListProps {
  conversations: ChatConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  isLoading: boolean
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  isLoading,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = searchQuery
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/[0.06]">
        <button
          onClick={onCreate}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            'bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff]',
            'hover:bg-[#00f0ff]/20 hover:shadow-[0_0_12px_rgba(0,240,255,0.1)]',
          )}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#00f0ff]/20"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-white/10">
        {isLoading && (
          <div className="text-center py-8 text-xs text-white/20">Loading...</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-6 h-6 text-white/10 mx-auto mb-2" />
            <p className="text-xs text-white/20">
              {searchQuery ? 'No matching chats' : 'No conversations yet'}
            </p>
          </div>
        )}

        {filtered.map((conv) => {
          const isActive = conv.id === activeId
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'group w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all',
                isActive
                  ? 'bg-[#00f0ff]/10 border border-[#00f0ff]/15'
                  : 'hover:bg-white/[0.04] border border-transparent',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-xs font-medium truncate',
                      isActive ? 'text-white/80' : 'text-white/50',
                    )}
                  >
                    {conv.title || 'New Chat'}
                  </div>
                  {conv.lastMessage && (
                    <div className="text-[10px] text-white/20 truncate mt-0.5">
                      {conv.lastMessage}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conv.id)
                  }}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-red-400/50 hover:text-red-400" />
                </button>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
