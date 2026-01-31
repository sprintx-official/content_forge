import { api } from '@/lib/api'
import type { ForgeInput, HistoryItem } from '@/types'

export interface GenerateRequest {
  input: ForgeInput
  workflowId?: string
}

export async function generateContent(request: GenerateRequest): Promise<HistoryItem> {
  return api.post<HistoryItem>('/api/generate', request)
}

// ---------------------------------------------------------------------------
// SSE streaming client
// ---------------------------------------------------------------------------

export interface AgentStartEvent {
  agentIndex: number
  agentName: string
  agentIcon: string
  totalAgents: number
}

export interface AgentCompleteEvent {
  agentIndex: number
  agentName: string
  tokenUsage: {
    inputTokens: number
    cachedInputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    model: string
  }
}

export interface TokenEvent {
  chunk: string
}

export interface PipelineCompleteEvent {
  id: string
  input: ForgeInput
  output: HistoryItem['output']
  workflowName?: string
  createdAt: string
}

export interface StreamErrorEvent {
  message: string
}

export interface StreamEventCallbacks {
  onAgentStart?: (event: AgentStartEvent) => void
  onAgentComplete?: (event: AgentCompleteEvent) => void
  onToken?: (event: TokenEvent) => void
  onPipelineComplete?: (event: PipelineCompleteEvent) => void
  onError?: (event: StreamErrorEvent) => void
}

/**
 * Start a streaming content generation request.
 * Returns an AbortController that can be used to cancel the stream.
 */
export function generateContentStream(
  request: GenerateRequest,
  callbacks: StreamEventCallbacks,
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

  // Launch the fetch in the background — no await at top level
  ;(async () => {
    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      // Non-200: response is JSON error (validation failed before SSE)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        callbacks.onError?.({ message: data.error || `Request failed with status ${res.status}` })
        return
      }

      // Parse SSE stream from response body
      const reader = res.body?.getReader()
      if (!reader) {
        callbacks.onError?.({ message: 'Streaming not supported in this browser.' })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split on double-newline SSE boundaries
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
              case 'agent:start':
                callbacks.onAgentStart?.(parsed as AgentStartEvent)
                break
              case 'agent:complete':
                callbacks.onAgentComplete?.(parsed as AgentCompleteEvent)
                break
              case 'token':
                callbacks.onToken?.(parsed as TokenEvent)
                break
              case 'pipeline:complete':
                callbacks.onPipelineComplete?.(parsed as PipelineCompleteEvent)
                break
              case 'error':
                callbacks.onError?.(parsed as StreamErrorEvent)
                break
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      // Ignore abort errors (user cancelled)
      if (err instanceof DOMException && err.name === 'AbortError') return
      callbacks.onError?.({
        message: err instanceof Error ? err.message : 'Content generation failed. Please try again.',
      })
    }
  })()

  return controller
}
