import { useEffect, useRef } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '@/types'

interface ChatThreadProps {
  messages: ChatMessageType[]
  isStreaming: boolean
  streamingContent: string
}

export function ChatThread({ messages, isStreaming, streamingContent }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
            <Bot className="w-7 h-7 text-[#00f0ff]/40" />
          </div>
          <p className="text-white/30 text-sm">Start a conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin scrollbar-thumb-white/10">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* Streaming bubble */}
      {isStreaming && streamingContent && (
        <div className="group flex gap-3 py-4 px-3 flex-row">
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.06] border border-white/[0.08]">
            <Bot className="w-4 h-4 text-[#00f0ff]" />
          </div>
          <div className="relative max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed bg-white/[0.04] border border-white/[0.08] text-white/80">
            <div className="whitespace-pre-wrap break-words">{streamingContent}</div>
            <span className="inline-block w-1.5 h-4 bg-[#00f0ff]/50 animate-pulse ml-0.5 align-middle" />
          </div>
        </div>
      )}

      {/* Typing indicator when streaming but no content yet */}
      {isStreaming && !streamingContent && (
        <div className="flex gap-3 py-4 px-3">
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.06] border border-white/[0.08]">
            <Bot className="w-4 h-4 text-[#00f0ff]" />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <Loader2 className="w-3.5 h-3.5 text-[#00f0ff]/50 animate-spin" />
            <span className="text-xs text-white/30">Thinking...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
