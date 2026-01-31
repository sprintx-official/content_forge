import { useState, useEffect } from 'react'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/useChatStore'
import { ChatThread } from '@/components/chat/ChatThread'
import { ChatInput } from '@/components/chat/ChatInput'
import { QuickActions } from '@/components/chat/QuickActions'

interface MiniChatPanelProps {
  contentContext: string
}

export default function MiniChatPanel({ contentContext }: MiniChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    cancelStream,
    createConversation,
    activeConversationId,
  } = useChatStore()

  // Auto-create a conversation when opening mini-chat for the first time
  useEffect(() => {
    if (isOpen && !activeConversationId) {
      createConversation()
    }
  }, [isOpen, activeConversationId, createConversation])

  const handleSend = (content: string) => {
    sendMessage(content, contentContext)
  }

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt, contentContext)
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a1a]/60 overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 transition-colors',
          'hover:bg-white/[0.03]',
          isOpen && 'border-b border-white/[0.06]',
        )}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#00f0ff]/50" />
          <span className="text-sm font-medium text-white/50">
            Ask AI about this content
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-white/30" />
        ) : (
          <ChevronUp className="w-4 h-4 text-white/30" />
        )}
      </button>

      {/* Chat body */}
      {isOpen && (
        <div className="flex flex-col h-[350px]">
          {/* Quick actions */}
          <QuickActions onAction={handleQuickAction} disabled={isStreaming} />

          {/* Messages */}
          <ChatThread
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
          />

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            onCancel={cancelStream}
            isStreaming={isStreaming}
            placeholder="Ask about the generated content..."
          />
        </div>
      )}
    </div>
  )
}
