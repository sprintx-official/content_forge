import { useState } from 'react'
import { Copy, Check, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/types'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'group flex gap-3 py-4 px-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          isUser
            ? 'bg-gradient-to-br from-[#a855f7]/20 to-[#00f0ff]/20 border border-[#a855f7]/20'
            : 'bg-white/[0.06] border border-white/[0.08]',
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[#a855f7]" />
        ) : (
          <Bot className="w-4 h-4 text-[#00f0ff]" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'relative max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-gradient-to-br from-[#a855f7]/10 to-[#00f0ff]/10 border border-[#a855f7]/15 text-white/90'
            : 'bg-white/[0.04] border border-white/[0.08] text-white/80',
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Copy button */}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08]"
            title="Copy"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-white/40" />
            )}
          </button>
        )}

        {/* Token usage tooltip */}
        {message.tokenUsage && (
          <div className="mt-2 text-[10px] text-white/20 font-mono">
            {message.model} &middot; {message.tokenUsage.totalTokens.toLocaleString()} tokens
          </div>
        )}
      </div>
    </div>
  )
}
