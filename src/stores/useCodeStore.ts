import { create } from 'zustand'
import type { CodeLanguage } from '@/types'
import { useForgeStore } from '@/stores/useForgeStore'
import { uploadAttachments } from '@/services/attachmentService'

interface CodeTokenUsage {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  provider: string
  model: string
}

interface CodeState {
  prompt: string
  language: CodeLanguage
  generatedCode: string
  isGenerating: boolean
  streamingCode: string
  tokenUsage: CodeTokenUsage | null
  abortController: AbortController | null
  error: string | null
  attachments: File[]

  setPrompt: (prompt: string) => void
  setLanguage: (language: CodeLanguage) => void
  setAttachments: (files: File[]) => void
  generate: () => Promise<void>
  cancelGeneration: () => void
  reset: () => void
}

const TOKEN_KEY = 'cf_jwt'

export const useCodeStore = create<CodeState>((set, get) => ({
  prompt: '',
  language: 'typescript',
  generatedCode: '',
  isGenerating: false,
  streamingCode: '',
  tokenUsage: null,
  abortController: null,
  error: null,
  attachments: [],

  setPrompt: (prompt: string) => set({ prompt }),
  setLanguage: (language: CodeLanguage) => set({ language }),
  setAttachments: (files: File[]) => set({ attachments: files }),

  generate: async () => {
    const { prompt, language, attachments } = get()
    if (!prompt.trim()) return

    set({
      isGenerating: true,
      streamingCode: '',
      generatedCode: '',
      tokenUsage: null,
      error: null,
    })

    // Upload attachments if any
    let attachmentIds: string[] | undefined
    if (attachments.length > 0) {
      try {
        const uploaded = await uploadAttachments(attachments)
        attachmentIds = uploaded.map((a) => a.id)
      } catch (err) {
        set({
          isGenerating: false,
          error: err instanceof Error ? err.message : 'Failed to upload files',
        })
        return
      }
    }

    const controller = new AbortController()
    set({ abortController: controller })

    const selectedModel = useForgeStore.getState().selectedModel
    const token = localStorage.getItem(TOKEN_KEY)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const res = await fetch('/api/generate/code', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          language,
          ...(selectedModel?.modelId && { modelId: selectedModel.modelId }),
          ...(selectedModel?.provider && { provider: selectedModel.provider }),
          ...(attachmentIds && { attachmentIds }),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        set({ isGenerating: false, error: data.error || `Request failed with status ${res.status}`, abortController: null })
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        set({ isGenerating: false, error: 'Streaming not supported.', abortController: null })
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
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            else if (line.startsWith('data: ')) eventData = line.slice(6)
          }

          if (!eventData) continue

          try {
            const parsed = JSON.parse(eventData)
            switch (eventType) {
              case 'token':
                set((s) => ({ streamingCode: s.streamingCode + parsed.chunk }))
                break
              case 'complete':
                set({
                  generatedCode: parsed.content,
                  tokenUsage: parsed.tokenUsage,
                  isGenerating: false,
                  streamingCode: '',
                  abortController: null,
                })
                break
              case 'error':
                set({
                  error: parsed.message,
                  isGenerating: false,
                  streamingCode: '',
                  abortController: null,
                })
                break
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      set({
        isGenerating: false,
        streamingCode: '',
        abortController: null,
        error: err instanceof Error ? err.message : 'Code generation failed.',
      })
    }
  },

  cancelGeneration: () => {
    const { abortController } = get()
    if (abortController) abortController.abort()
    set({ isGenerating: false, streamingCode: '', abortController: null })
  },

  reset: () => set({
    prompt: '',
    generatedCode: '',
    isGenerating: false,
    streamingCode: '',
    tokenUsage: null,
    abortController: null,
    error: null,
    attachments: [],
  }),
}))
