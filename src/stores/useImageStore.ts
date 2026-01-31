import { create } from 'zustand'
import type { GeneratedImage, ImageSize, ImageStyle } from '@/types'
import { IMAGE_SIZES } from '@/constants'
import { useForgeStore } from '@/stores/useForgeStore'
import * as imageService from '@/services/imageService'

interface ImageState {
  images: GeneratedImage[]
  isGenerating: boolean
  isLoadingImages: boolean
  prompt: string
  selectedSize: ImageSize
  selectedStyle: ImageStyle
  error: string | null

  setPrompt: (prompt: string) => void
  setSize: (size: ImageSize) => void
  setStyle: (style: ImageStyle) => void
  generate: () => Promise<void>
  loadImages: () => Promise<void>
  deleteImage: (id: string) => Promise<void>
  clearError: () => void
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  isGenerating: false,
  isLoadingImages: false,
  prompt: '',
  selectedSize: IMAGE_SIZES[0],
  selectedStyle: 'natural',
  error: null,

  setPrompt: (prompt) => set({ prompt }),
  setSize: (size) => set({ selectedSize: size }),
  setStyle: (style) => set({ selectedStyle: style }),

  generate: async () => {
    const { prompt, selectedSize, selectedStyle } = get()
    if (!prompt.trim()) return

    set({ isGenerating: true, error: null })
    try {
      const selectedModel = useForgeStore.getState().selectedModel
      const image = await imageService.generateImage({
        prompt: prompt.trim(),
        size: selectedSize,
        style: selectedStyle,
        modelId: selectedModel?.modelId,
        provider: selectedModel?.provider,
      })
      set((s) => ({
        images: [image, ...s.images],
        isGenerating: false,
        prompt: '',
      }))
    } catch (err) {
      set({
        isGenerating: false,
        error: err instanceof Error ? err.message : 'Image generation failed',
      })
    }
  },

  loadImages: async () => {
    set({ isLoadingImages: true })
    try {
      const images = await imageService.getImages()
      set({ images, isLoadingImages: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load images'
      set({
        isLoadingImages: false,
        // JSON parse errors indicate the server isn't reachable (HTML returned instead of JSON)
        error: msg.includes('is not valid JSON')
          ? 'Unable to connect to the server. Please make sure the backend is running.'
          : msg,
      })
    }
  },

  deleteImage: async (id) => {
    try {
      await imageService.deleteImage(id)
      set((s) => ({ images: s.images.filter((img) => img.id !== id) }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete image' })
    }
  },

  clearError: () => set({ error: null }),
}))
