import { create } from 'zustand'
import type { ContentTypeOption, ToneOption, AudienceOption } from '@/types'
import { useForgeStore } from '@/stores/useForgeStore'

const TOKEN_KEY = 'cf_jwt'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

interface ForgeOptionBackend {
  id: string
  category: string
  value: string
  label: string
  description: string
  guidance: string
  icon: string
  placeholder: string
  sortOrder: number
  isActive: boolean
}

interface ForgeOptionsState {
  contentTypes: ContentTypeOption[]
  tones: ToneOption[]
  audiences: AudienceOption[]
  loaded: boolean
  loading: boolean
  loadOptions: () => Promise<void>
  // Admin CRUD
  createOption: (data: {
    category: 'content_type' | 'tone' | 'audience'
    value: string
    label: string
    description?: string
    guidance?: string
    icon?: string
    placeholder?: string
    sortOrder?: number
  }) => Promise<void>
  updateOption: (id: string, data: {
    value?: string
    label?: string
    description?: string
    guidance?: string
    icon?: string
    placeholder?: string
    sortOrder?: number
  }) => Promise<void>
  deleteOption: (id: string) => Promise<void>
}

function mapContentType(o: ForgeOptionBackend): ContentTypeOption {
  return { id: o.value, name: o.label, description: o.description, icon: o.icon, placeholder: o.placeholder }
}

function mapTone(o: ForgeOptionBackend): ToneOption {
  return { id: o.value, name: o.label, description: o.description }
}

function mapAudience(o: ForgeOptionBackend): AudienceOption {
  return { id: o.value, name: o.label, description: o.description }
}

export const useForgeOptionsStore = create<ForgeOptionsState>((set, get) => ({
  contentTypes: [],
  tones: [],
  audiences: [],
  loaded: false,
  loading: false,

  loadOptions: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const res = await fetch('/api/forge-options', { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to load options')
      const data = await res.json() as {
        content_type: ForgeOptionBackend[]
        tone: ForgeOptionBackend[]
        audience: ForgeOptionBackend[]
      }
      const contentTypes = (data.content_type || []).map(mapContentType)
      const tones = (data.tone || []).map(mapTone)
      const audiences = (data.audience || []).map(mapAudience)
      set({ contentTypes, tones, audiences, loaded: true })

      // Set defaults on forge store if current selections are empty
      const forgeState = useForgeStore.getState()
      const updates: Record<string, string> = {}
      if (!forgeState.input.contentType && contentTypes.length > 0) {
        updates.contentType = contentTypes[0].id
      }
      if (!forgeState.input.tone && tones.length > 0) {
        updates.tone = tones[0].id
      }
      if (!forgeState.input.audience && audiences.length > 0) {
        updates.audience = audiences[0].id
      }
      if (Object.keys(updates).length > 0) {
        forgeState.setInput(updates)
      }
    } catch (err) {
      console.error('Failed to load forge options:', err)
    } finally {
      set({ loading: false })
    }
  },

  createOption: async (data) => {
    const res = await fetch('/api/forge-options', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to create option' }))
      throw new Error(body.error || 'Failed to create option')
    }
    // Reload all options
    set({ loaded: false })
    await get().loadOptions()
  },

  updateOption: async (id, data) => {
    const res = await fetch(`/api/forge-options/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to update option' }))
      throw new Error(body.error || 'Failed to update option')
    }
    set({ loaded: false })
    await get().loadOptions()
  },

  deleteOption: async (id) => {
    const res = await fetch(`/api/forge-options/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to delete option' }))
      throw new Error(body.error || 'Failed to delete option')
    }
    set({ loaded: false })
    await get().loadOptions()
  },
}))
