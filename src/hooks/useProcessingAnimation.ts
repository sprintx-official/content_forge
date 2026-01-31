import { useState, useEffect, useRef, useCallback } from 'react'
import { PROCESSING_STAGES } from '@/constants'
import type { ProcessingStage } from '@/types'

interface UseProcessingAnimationReturn {
  stages: ProcessingStage[]
  currentStageIndex: number
  displayMessage: string
  progress: number
}

/**
 * Reactive processing animation hook.
 *
 * When `customStages` are provided AND their statuses are updated externally
 * (by the Zustand store via SSE events), this hook derives all UI state from
 * them — no internal timers.
 *
 * When `customStages` is null (shouldn't happen with SSE, but safe fallback),
 * it falls back to the default PROCESSING_STAGES.
 */
export function useProcessingAnimation(
  isProcessing: boolean,
  customStages?: ProcessingStage[] | null,
): UseProcessingAnimationReturn {
  const [displayMessage, setDisplayMessage] = useState('')
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMessageRef = useRef('')

  const clearTyping = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
  }, [])

  const typeMessage = useCallback(
    (message: string) => {
      // Don't re-type the same message
      if (message === lastMessageRef.current) return
      lastMessageRef.current = message

      clearTyping()
      let charIndex = 0
      setDisplayMessage('')

      typingIntervalRef.current = setInterval(() => {
        if (charIndex < message.length) {
          setDisplayMessage(message.slice(0, charIndex + 1))
          charIndex++
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current)
            typingIntervalRef.current = null
          }
        }
      }, 30)
    },
    [clearTyping],
  )

  // Derive stages from customStages (externally driven) or defaults
  const stages: ProcessingStage[] =
    customStages && customStages.length > 0
      ? customStages
      : PROCESSING_STAGES.map((s) => ({ ...s, status: 'pending' as const }))

  // Find current stage index from stage statuses
  const activeIndex = stages.findIndex((s) => s.status === 'active')
  // If none active, check if all completed
  const lastCompletedIndex = stages.reduce(
    (acc, s, i) => (s.status === 'completed' ? i : acc),
    -1,
  )
  const currentStageIndex = activeIndex >= 0 ? activeIndex : lastCompletedIndex

  // Compute progress from stage statuses
  const total = stages.length
  const completedCount = stages.filter((s) => s.status === 'completed').length
  const hasActive = activeIndex >= 0
  const progress = total > 0
    ? Math.min(100, ((completedCount + (hasActive ? 0.5 : 0)) / total) * 100)
    : 0

  // When the active stage changes, type its message
  useEffect(() => {
    if (!isProcessing) {
      clearTyping()
      setDisplayMessage('')
      lastMessageRef.current = ''
      return
    }

    const activeStage = activeIndex >= 0 ? stages[activeIndex] : null
    if (activeStage) {
      typeMessage(activeStage.message)
    }
  }, [isProcessing, activeIndex, stages, typeMessage, clearTyping])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTyping()
  }, [clearTyping])

  return {
    stages,
    currentStageIndex,
    displayMessage,
    progress,
  }
}
