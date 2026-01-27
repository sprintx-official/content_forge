import { create } from 'zustand'
import type {
  ForgeInput,
  ForgeOutput,
  ContentType,
  Tone,
  Audience,
  ContentLength,
  ProcessingStageId,
  ProcessingStage,
  Workflow,
} from '@/types'
import { generateContent } from '@/services/contentGenerator'
import { PROCESSING_STAGES } from '@/constants'
import { getAllAgents } from '@/services/agentService'
import { buildStagesFromWorkflow } from '@/services/workflowService'
import { useHistoryStore } from '@/stores/useHistoryStore'

interface ForgeState {
  input: ForgeInput
  output: ForgeOutput | null
  processingStage: ProcessingStageId | null
  isProcessing: boolean
  selectedWorkflow: Workflow | null
  dynamicStages: ProcessingStage[] | null
  error: string | null
  setInput: (partial: Partial<ForgeInput>) => void
  setContentType: (contentType: ContentType) => void
  setTone: (tone: Tone) => void
  setAudience: (audience: Audience) => void
  setLength: (length: ContentLength) => void
  setTopic: (topic: string) => void
  setWorkflow: (workflow: Workflow | null) => void
  generate: () => Promise<void>
  reset: () => void
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const defaultInput: ForgeInput = {
  contentType: 'article',
  tone: 'professional',
  audience: 'general',
  length: 'medium',
  topic: '',
}

export const useForgeStore = create<ForgeState>((set, get) => ({
  input: { ...defaultInput },
  output: null,
  processingStage: null,
  isProcessing: false,
  selectedWorkflow: null,
  dynamicStages: null,
  error: null,

  setInput: (partial: Partial<ForgeInput>) => {
    set((state) => ({ input: { ...state.input, ...partial } }))
  },

  setContentType: (contentType: ContentType) => {
    set((state) => ({ input: { ...state.input, contentType } }))
  },

  setTone: (tone: Tone) => {
    set((state) => ({ input: { ...state.input, tone } }))
  },

  setAudience: (audience: Audience) => {
    set((state) => ({ input: { ...state.input, audience } }))
  },

  setLength: (length: ContentLength) => {
    set((state) => ({ input: { ...state.input, length } }))
  },

  setTopic: (topic: string) => {
    set((state) => ({ input: { ...state.input, topic } }))
  },

  setWorkflow: (workflow: Workflow | null) => {
    set({ selectedWorkflow: workflow })
  },

  generate: async () => {
    const { input, selectedWorkflow } = get()

    let stages: ProcessingStage[]

    if (selectedWorkflow) {
      const agents = await getAllAgents()
      stages = buildStagesFromWorkflow(selectedWorkflow.steps, agents)
    } else {
      stages = PROCESSING_STAGES.map((s) => ({ ...s }))
    }

    set({
      isProcessing: true,
      output: null,
      processingStage: null,
      dynamicStages: stages,
      error: null,
    })

    // Run animation and API call concurrently
    const animationPromise = (async () => {
      for (const stage of stages) {
        set({ processingStage: stage.id as ProcessingStageId })
        await delay(1500)
      }
    })()

    const contentPromise = generateContent({
      input,
      workflowId: selectedWorkflow?.id,
    })

    try {
      const [, historyItem] = await Promise.all([animationPromise, contentPromise])

      set({ output: historyItem.output, isProcessing: false, processingStage: null })

      // Server already saved to history, just prepend to local state
      useHistoryStore.getState().prependItem(historyItem)
    } catch (err) {
      // Wait for animation to finish even on error
      await animationPromise
      set({
        isProcessing: false,
        processingStage: null,
        error: err instanceof Error ? err.message : 'Content generation failed. Please try again.',
      })
    }
  },

  reset: () => {
    set({ output: null, processingStage: null, isProcessing: false, dynamicStages: null, error: null })
  },
}))
