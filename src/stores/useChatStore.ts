import { create } from 'zustand'
import type { ChatConversation, ChatMessage } from '@/types'
import * as chatService from '@/services/chatService'
import { useForgeStore } from '@/stores/useForgeStore'

interface ChatState {
  conversations: ChatConversation[]
  activeConversationId: string | null
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string
  abortController: AbortController | null
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  error: string | null

  loadConversations: () => Promise<void>
  createConversation: () => Promise<string>
  selectConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  sendMessage: (content: string, context?: string) => Promise<void>
  cancelStream: () => void
  clearError: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  abortController: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
  error: null,

  loadConversations: async () => {
    set({ isLoadingConversations: true })
    try {
      const conversations = await chatService.getConversations()
      set({ conversations, isLoadingConversations: false })
    } catch (err) {
      set({
        isLoadingConversations: false,
        error: err instanceof Error ? err.message : 'Failed to load conversations',
      })
    }
  },

  createConversation: async () => {
    try {
      const conv = await chatService.createConversation()
      set((s) => ({
        conversations: [conv, ...s.conversations],
        activeConversationId: conv.id,
        messages: [],
        streamingContent: '',
        error: null,
      }))
      return conv.id
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create conversation' })
      throw err
    }
  },

  selectConversation: async (id: string) => {
    set({ activeConversationId: id, isLoadingMessages: true, messages: [], streamingContent: '' })
    try {
      const { messages } = await chatService.getConversation(id)
      set({ messages, isLoadingMessages: false })
    } catch (err) {
      set({
        isLoadingMessages: false,
        error: err instanceof Error ? err.message : 'Failed to load messages',
      })
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await chatService.deleteConversation(id)
      const { activeConversationId } = get()
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        ...(activeConversationId === id
          ? { activeConversationId: null, messages: [], streamingContent: '' }
          : {}),
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete conversation' })
    }
  },

  sendMessage: async (content: string, context?: string) => {
    let { activeConversationId } = get()

    // Auto-create conversation if none selected
    if (!activeConversationId) {
      activeConversationId = await get().createConversation()
    }

    const convId = activeConversationId!

    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }

    set((s) => ({
      messages: [...s.messages, tempUserMsg],
      isStreaming: true,
      streamingContent: '',
      error: null,
    }))

    const selectedModel = useForgeStore.getState().selectedModel
    const controller = chatService.sendMessageStream(
      convId,
      content,
      {
        onUserMessageId: (id) => {
          // Replace temp ID with real ID
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === tempUserMsg.id ? { ...m, id } : m,
            ),
          }))
        },
        onToken: (chunk) => {
          set((s) => ({
            streamingContent: s.streamingContent + chunk,
          }))
        },
        onComplete: (msg) => {
          const assistantMsg: ChatMessage = {
            id: msg.id,
            conversationId: convId,
            role: 'assistant',
            content: msg.content,
            model: msg.model,
            provider: msg.provider,
            tokenUsage: msg.tokenUsage,
            createdAt: new Date().toISOString(),
          }

          set((s) => ({
            messages: [...s.messages, assistantMsg],
            isStreaming: false,
            streamingContent: '',
            abortController: null,
          }))

          // Update conversation in list
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    title: c.messageCount === 0 ? content.slice(0, 100) : c.title,
                    lastMessage: msg.content.slice(0, 200),
                    messageCount: c.messageCount + 2,
                    updatedAt: new Date().toISOString(),
                  }
                : c,
            ),
          }))
        },
        onError: (message) => {
          set({
            isStreaming: false,
            streamingContent: '',
            abortController: null,
            error: message,
          })
        },
      },
      context,
      selectedModel?.modelId,
      selectedModel?.provider,
    )

    set({ abortController: controller })
  },

  cancelStream: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
    }
    set({ isStreaming: false, streamingContent: '', abortController: null })
  },

  clearError: () => set({ error: null }),
}))
