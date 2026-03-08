import { useState } from 'react'
import { Copy, Check, Bot, User, FileText } from 'lucide-react'
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

  const imageAttachments = message.attachments?.filter((a) => a.mimeType.startsWith('image/')) || []
  const docAttachments = message.attachments?.filter((a) => !a.mimeType.startsWith('image/')) || []

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
            ? 'bg-gradient-to-br from-[#6366f1]/20 to-[#10b981]/20 border border-[#6366f1]/20'
            : 'bg-white/[0.06] border border-white/[0.08]',
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[#6366f1]" />
        ) : (
          <Bot className="w-4 h-4 text-[#10b981]" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'relative max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-gradient-to-br from-[#6366f1]/10 to-[#10b981]/10 border border-[#6366f1]/15 text-white/90'
            : 'bg-white/[0.04] border border-white/[0.08] text-white/80',
        )}
      >
        {/* Image attachments */}
        {imageAttachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', message.content && 'mb-2')}>
            {imageAttachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={att.url}
                  alt={att.filename}
                  className="max-h-48 max-w-full rounded-lg object-contain border border-white/[0.08]"
                />
              </a>
            ))}
          </div>
        )}

        {/* Document attachments */}
        {docAttachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-1.5', message.content && 'mb-2')}>
            {docAttachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] px-2 py-1 text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{att.filename}</span>
              </a>
            ))}
          </div>
        )}

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
