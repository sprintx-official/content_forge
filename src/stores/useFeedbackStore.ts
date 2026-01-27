import { create } from 'zustand'
import * as feedbackService from '@/services/feedbackService'
import type { FeedbackItem } from '@/types'

interface FeedbackState {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
  submitFeedback: (data: Omit<FeedbackItem, 'id' | 'createdAt'>) => Promise<FeedbackItem>
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  isModalOpen: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  submitFeedback: async (data) => {
    const feedback = await feedbackService.createFeedback(data)
    return feedback
  },
}))
