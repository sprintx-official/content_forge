import { useEffect, useState } from 'react'
import { X, MessageSquare, Cpu, DollarSign, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as chatService from '@/services/chatService'
import type { ChatConversation, ChatMessage } from '@/types'

interface ChatViewModalProps {
  conversation: ChatConversation
  onClose: () => void
}

export default function ChatViewModal({ conversation, onClose }: ChatViewModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chatService
      .getConversation(conversation.id)
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [conversation.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const formattedDate = new Date(conversation.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0a0e1a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 shrink-0">
              Chat
            </span>
            <h3 className="text-lg font-semibold text-[#f9fafb] truncate">
              {conversation.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors shrink-0 ml-4 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 px-6 py-3 text-xs text-[#9ca3af] border-b border-white/5">
          <span>{formattedDate}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {conversation.messageCount} messages
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#9ca3af]" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-[#6b7280] py-12">No messages in this conversation.</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-xl px-4 py-3 max-w-[85%]',
                  msg.role === 'user'
                    ? 'ml-auto bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#e5e7eb]'
                    : 'mr-auto bg-white/[0.04] border border-white/[0.06] text-[#d1d5db]',
                )}
              >
                <p className="text-xs font-medium mb-1.5 text-white/40">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.tokenUsage && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5 text-[10px] text-white/30">
                    <span className="inline-flex items-center gap-0.5">
                      <Cpu className="h-3 w-3" />
                      {msg.tokenUsage.totalTokens.toLocaleString()} tokens
                    </span>
                    {msg.model && <span>{msg.model}</span>}
                    <span className="inline-flex items-center gap-0.5 text-emerald-400/60">
                      <DollarSign className="h-3 w-3" />
                      ${msg.tokenUsage.costUsd.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
