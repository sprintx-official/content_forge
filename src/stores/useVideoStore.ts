import { create } from 'zustand'
import type { GeneratedVideo } from '@/types'
import { useForgeStore } from '@/stores/useForgeStore'
import * as videoService from '@/services/videoService'

export type VideoAspectRatio = '16:9' | '9:16'

export const VIDEO_ASPECT_RATIOS: { id: VideoAspectRatio; label: string }[] = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Portrait' },
]

export const VIDEO_DURATIONS: { seconds: number; label: string }[] = [
  { seconds: 5, label: '5 sec' },
  { seconds: 8, label: '8 sec (max)' },
]

interface VideoState {
  videos: GeneratedVideo[]
  isGenerating: boolean
  isLoadingVideos: boolean
  isExtending: boolean
  extendingVideoId: string | null
  prompt: string
  selectedAspectRatio: VideoAspectRatio
  selectedDuration: number
  error: string | null
  progress: string | null

  setPrompt: (prompt: string) => void
  setAspectRatio: (ratio: VideoAspectRatio) => void
  setDuration: (seconds: number) => void
  generate: () => Promise<void>
  extendVideo: (sourceVideoId: string, prompt: string) => Promise<void>
  loadVideos: () => Promise<void>
  deleteVideo: (id: string) => Promise<void>
  clearError: () => void
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  isGenerating: false,
  isLoadingVideos: false,
  isExtending: false,
  extendingVideoId: null,
  prompt: '',
  selectedAspectRatio: '16:9',
  selectedDuration: 8,
  error: null,
  progress: null,

  setPrompt: (prompt) => set({ prompt }),
  setAspectRatio: (ratio) => set({ selectedAspectRatio: ratio }),
  setDuration: (seconds) => set({ selectedDuration: seconds }),

  generate: async () => {
    const { prompt, selectedAspectRatio, selectedDuration } = get()
    if (!prompt.trim()) return

    set({ isGenerating: true, error: null, progress: 'Starting video generation...' })
    try {
      const selectedModel = useForgeStore.getState().selectedModel
      const video = await videoService.generateVideo({
        prompt: prompt.trim(),
        aspectRatio: selectedAspectRatio,
        durationSeconds: selectedDuration,
        modelId: selectedModel?.modelId,
        provider: selectedModel?.provider,
      })
      set((s) => ({
        videos: [video, ...s.videos],
        isGenerating: false,
        prompt: '',
        progress: null,
      }))
    } catch (err) {
      set({
        isGenerating: false,
        progress: null,
        error: err instanceof Error ? err.message : 'Video generation failed',
      })
    }
  },

  extendVideo: async (sourceVideoId, prompt) => {
    if (!prompt.trim()) return
    set({ isExtending: true, extendingVideoId: sourceVideoId, error: null, progress: 'Extending video...' })
    try {
      const video = await videoService.extendVideo({
        sourceVideoId,
        prompt: prompt.trim(),
      })
      set((s) => ({
        videos: [video, ...s.videos],
        isExtending: false,
        extendingVideoId: null,
        progress: null,
      }))
    } catch (err) {
      set({
        isExtending: false,
        extendingVideoId: null,
        progress: null,
        error: err instanceof Error ? err.message : 'Video extension failed',
      })
    }
  },

  loadVideos: async () => {
    set({ isLoadingVideos: true })
    try {
      const videos = await videoService.getVideos()
      set({ videos, isLoadingVideos: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load videos'
      set({
        isLoadingVideos: false,
        error: msg.includes('is not valid JSON')
          ? 'Unable to connect to the server. Please make sure the backend is running.'
          : msg,
      })
    }
  },

  deleteVideo: async (id) => {
    try {
      await videoService.deleteVideo(id)
      set((s) => ({ videos: s.videos.filter((v) => v.id !== id) }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete video' })
    }
  },

  clearError: () => set({ error: null }),
}))
