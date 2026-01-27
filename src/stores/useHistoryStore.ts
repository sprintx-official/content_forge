import { create } from 'zustand'
import { api } from '@/lib/api'
import type { ForgeInput, ForgeOutput, HistoryItem } from '@/types'

interface HistoryState {
  items: HistoryItem[]
  loading: boolean
  addItem: (input: ForgeInput, output: ForgeOutput, workflowName?: string) => Promise<void>
  prependItem: (item: HistoryItem) => void
  removeItem: (id: string) => Promise<void>
  updateItem: (id: string, content: string) => Promise<void>
  clearHistory: () => Promise<void>
  loadHistory: (search?: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  loading: false,

  addItem: async (input: ForgeInput, output: ForgeOutput, workflowName?: string) => {
    try {
      const item = await api.post<HistoryItem>('/api/history', { input, output, workflowName })
      set({ items: [item, ...get().items].slice(0, 50) })
    } catch (err) {
      console.error('Failed to save history item:', err)
    }
  },

  prependItem: (item: HistoryItem) => {
    set({ items: [item, ...get().items].slice(0, 50) })
  },

  removeItem: async (id: string) => {
    try {
      await api.delete(`/api/history/${id}`)
      set({ items: get().items.filter((item) => item.id !== id) })
    } catch (err) {
      console.error('Failed to delete history item:', err)
    }
  },

  updateItem: async (id: string, content: string) => {
    try {
      const updated = await api.put<HistoryItem>(`/api/history/${id}`, { content })
      set({
        items: get().items.map((item) => (item.id === id ? updated : item)),
      })
    } catch (err) {
      console.error('Failed to update history item:', err)
    }
  },

  clearHistory: async () => {
    try {
      await api.delete('/api/history')
      set({ items: [] })
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  },

  loadHistory: async (search?: string) => {
    set({ loading: true })
    try {
      const path = search
        ? `/api/history?search=${encodeURIComponent(search)}`
        : '/api/history'
      const items = await api.get<HistoryItem[]>(path)
      set({ items })
    } catch {
      set({ items: [] })
    } finally {
      set({ loading: false })
    }
  },
}))
