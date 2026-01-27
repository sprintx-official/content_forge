import { useState, useEffect, useRef, useCallback } from 'react'
import { PROCESSING_STAGES } from '@/constants'
import type { ProcessingStage } from '@/types'

interface UseProcessingAnimationReturn {
  stages: ProcessingStage[]
  currentStageIndex: number
  displayMessage: string
  progress: number
}

export function useProcessingAnimation(
  isProcessing: boolean,
  customStages?: ProcessingStage[] | null,
): UseProcessingAnimationReturn {
  const [currentStageIndex, setCurrentStageIndex] = useState(-1)
  const [stages, setStages] = useState<ProcessingStage[]>(() =>
    PROCESSING_STAGES.map((s) => ({ ...s, status: 'pending' as const })),
  )
  const [displayMessage, setDisplayMessage] = useState('')
  const [progress, setProgress] = useState(0)

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isProcessingRef = useRef(isProcessing)

  // Keep the ref in sync
  isProcessingRef.current = isProcessing

  const clearAllTimers = useCallback(() => {
    for (const t of timeoutsRef.current) {
      clearTimeout(t)
    }
    timeoutsRef.current = []
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
  }, [])

  const typeMessage = useCallback(
    (message: string) => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }

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
    [],
  )

  useEffect(() => {
    // Determine which stages to use
    const sourceStages = (customStages && customStages.length > 0)
      ? customStages
      : PROCESSING_STAGES

    if (!isProcessing) {
      // Reset everything when processing stops
      clearAllTimers()
      setCurrentStageIndex(-1)
      setStages(
        sourceStages.map((s) => ({ ...s, status: 'pending' as const })),
      )
      setDisplayMessage('')
      setProgress(0)
      return
    }

    // Start the processing sequence
    const STAGE_DURATION = 1500
    const totalDuration = sourceStages.length * STAGE_DURATION
    let elapsed = 0

    const freshStages = sourceStages.map((s) => ({
      ...s,
      status: 'pending' as const,
    }))
    setStages(freshStages)

    sourceStages.forEach((stage, index) => {
      // Schedule activating this stage
      const activateTimeout = setTimeout(() => {
        if (!isProcessingRef.current) return

        setCurrentStageIndex(index)
        setStages((prev) =>
          prev.map((s, i) => {
            if (i === index) return { ...s, status: 'active' as const }
            if (i < index) return { ...s, status: 'completed' as const }
            return s
          }),
        )
        typeMessage(stage.message)
      }, elapsed)

      timeoutsRef.current.push(activateTimeout)

      // Schedule progress updates during this stage
      const PROGRESS_STEPS = 10
      const stepDuration = STAGE_DURATION / PROGRESS_STEPS
      for (let step = 1; step <= PROGRESS_STEPS; step++) {
        const progressTimeout = setTimeout(() => {
          if (!isProcessingRef.current) return
          const currentProgress =
            ((elapsed + step * stepDuration) / totalDuration) * 100
          setProgress(Math.min(currentProgress, 100))
        }, elapsed + step * stepDuration)
        timeoutsRef.current.push(progressTimeout)
      }

      // Schedule completing this stage
      const completeTimeout = setTimeout(() => {
        if (!isProcessingRef.current) return

        setStages((prev) =>
          prev.map((s, i) => {
            if (i === index) return { ...s, status: 'completed' as const }
            return s
          }),
        )
      }, elapsed + STAGE_DURATION)

      timeoutsRef.current.push(completeTimeout)

      elapsed += STAGE_DURATION
    })

    // Final completion
    const finalTimeout = setTimeout(() => {
      if (!isProcessingRef.current) return
      setProgress(100)
    }, elapsed)
    timeoutsRef.current.push(finalTimeout)

    return () => {
      clearAllTimers()
    }
  }, [isProcessing, customStages, clearAllTimers, typeMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  return {
    stages,
    currentStageIndex,
    displayMessage,
    progress,
  }
}
