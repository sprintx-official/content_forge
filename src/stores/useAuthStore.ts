import { create } from 'zustand'
import type { User } from '@/types'
import * as authService from '@/services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,

  login: async (email: string, password: string): Promise<boolean> => {
    try {
      const { user } = await authService.login(email, password)
      set({ user, isAuthenticated: true, isAdmin: user.role === 'admin' })
      return true
    } catch {
      return false
    }
  },

  logout: () => {
    authService.logout()
    set({ user: null, isAuthenticated: false, isAdmin: false })
  },

  initialize: async () => {
    if (!authService.hasToken()) {
      set({ isLoading: false })
      return
    }

    try {
      const user = await authService.getMe()
      set({ user, isAuthenticated: true, isAdmin: user.role === 'admin', isLoading: false })
    } catch {
      authService.logout()
      set({ user: null, isAuthenticated: false, isAdmin: false, isLoading: false })
    }
  },
}))
