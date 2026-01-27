import { create } from 'zustand'

interface ThemeState {
  reducedMotion: boolean
  toggleReducedMotion: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  reducedMotion: false,

  toggleReducedMotion: () => {
    set((state) => ({ reducedMotion: !state.reducedMotion }))
  },
}))
