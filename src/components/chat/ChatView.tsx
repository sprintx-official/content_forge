import { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/useChatStore'
import ModelSelector from '@/components/forge/ModelSelector'
import { ConversationList } from './ConversationList'
import { ChatThread } from './ChatThread'
import { ChatInput } from './ChatInput'

export function ChatView() {
  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    isLoadingConversations,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    cancelStream,
  } = useChatStore()

  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bold font-['Space_Grotesk'] bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent mb-3">
          AI Chat
        </h1>
        <p className="text-[#9ca3af] text-lg">
          Chat with AI assistants powered by multiple providers
        </p>
      </div>

      <div
        className={cn(
          'flex h-[65vh] rounded-2xl overflow-hidden',
          'bg-[#0a0a1a]/80 border border-white/[0.08]',
        )}
      >
        {/* Sidebar */}
        <div
          className={cn(
            'border-r border-white/[0.06] bg-white/[0.02] transition-all duration-300 overflow-hidden',
            sidebarOpen ? 'w-64 min-w-[256px]' : 'w-0 min-w-0',
          )}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={selectConversation}
            onCreate={createConversation}
            onDelete={deleteConversation}
            isLoading={isLoadingConversations}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/50"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
            <span className="text-xs text-white/25 font-mono flex-1 truncate">
              {activeConversationId
                ? conversations.find((c) => c.id === activeConversationId)?.title || 'Chat'
                : 'Select or create a conversation'}
            </span>
            <div className="shrink-0 w-48">
              <ModelSelector compact />
            </div>
          </div>

          {/* Thread */}
          <ChatThread
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
          />

          {/* Input */}
          <ChatInput
            onSend={(content) => sendMessage(content)}
            onCancel={cancelStream}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  )
}
