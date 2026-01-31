import { api } from '@/lib/api'
import type { ChatConversation, ChatMessage } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(raw: any): ChatConversation {
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId,
    title: raw.title,
    lastMessage: raw.last_message ?? raw.lastMessage ?? '',
    messageCount: raw.message_count ?? raw.messageCount ?? 0,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(raw: any): ChatMessage {
  return {
    id: raw.id,
    conversationId: raw.conversation_id ?? raw.conversationId,
    role: raw.role,
    content: raw.content,
    model: raw.model || undefined,
    provider: raw.provider || undefined,
    tokenUsage: raw.total_tokens
      ? {
          inputTokens: raw.input_tokens ?? 0,
          outputTokens: raw.output_tokens ?? 0,
          totalTokens: raw.total_tokens ?? 0,
          costUsd: raw.cost_usd ?? 0,
        }
      : undefined,
    createdAt: raw.created_at ?? raw.createdAt,
  }
}

export async function getConversations(): Promise<ChatConversation[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<{ data: any[] }>('/api/chat/conversations')
  return res.data.map(mapConversation)
}

export async function createConversation(title?: string): Promise<ChatConversation> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await api.post<any>('/api/chat/conversations', title ? { title } : {})
  return mapConversation(raw)
}

export async function getConversation(id: string): Promise<{
  conversation: ChatConversation
  messages: ChatMessage[]
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await api.get<{ conversation: any; messages: any[] }>(`/api/chat/conversations/${id}`)
  return {
    conversation: mapConversation(raw.conversation),
    messages: raw.messages.map(mapMessage),
  }
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/api/chat/conversations/${id}`)
}

// ---------------------------------------------------------------------------
// SSE streaming chat
// ---------------------------------------------------------------------------

export interface ChatStreamCallbacks {
  onUserMessageId?: (id: string) => void
  onToken?: (chunk: string) => void
  onComplete?: (msg: {
    id: string
    content: string
    model: string
    provider: string
    tokenUsage: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
      costUsd: number
    }
  }) => void
  onError?: (message: string) => void
}

export function sendMessageStream(
  conversationId: string,
  content: string,
  callbacks: ChatStreamCallbacks,
  context?: string,
  modelId?: string,
  provider?: string,
): AbortController {
  const controller = new AbortController()

  const TOKEN_KEY = 'cf_jwt'
  const token = localStorage.getItem(TOKEN_KEY)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  ;(async () => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          context,
          ...(modelId && { modelId }),
          ...(provider && { provider }),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        callbacks.onError?.(data.error || `Request failed with status ${res.status}`)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        callbacks.onError?.('Streaming not supported in this browser.')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (!part.trim()) continue

          let eventType: string | undefined
          let eventData: string | undefined

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6)
            }
          }

          if (!eventData) continue

          try {
            const parsed = JSON.parse(eventData)
            switch (eventType) {
              case 'user_message':
                callbacks.onUserMessageId?.(parsed.id)
                break
              case 'token':
                callbacks.onToken?.(parsed.chunk)
                break
              case 'complete':
                callbacks.onComplete?.(parsed)
                break
              case 'error':
                callbacks.onError?.(parsed.message)
                break
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      callbacks.onError?.(
        err instanceof Error ? err.message : 'Chat failed. Please try again.',
      )
    }
  })()

  return controller
}
