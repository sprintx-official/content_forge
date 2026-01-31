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
  ParsedFile,
  RefineState,
} from '@/types'
import { generateContent, generateContentStream } from '@/services/contentGenerator'
import { PROCESSING_STAGES } from '@/constants'
import { getAllAgents } from '@/services/agentService'
import { buildStagesFromWorkflow } from '@/services/workflowService'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { parseMultiFileContent } from '@/lib/fileParser'
import { calculateMetrics } from '@/services/metricsCalculator'

interface SelectedModel {
  modelId: string
  provider: string
}

export interface TerminalLogEntry {
  text: string
  time: string
}

interface ForgeState {
  input: ForgeInput
  output: ForgeOutput | null
  processingStage: ProcessingStageId | null
  isProcessing: boolean
  selectedWorkflow: Workflow | null
  selectedModel: SelectedModel | null
  dynamicStages: ProcessingStage[] | null
  error: string | null

  // SSE streaming state
  streamingContent: string
  terminalLogs: TerminalLogEntry[]
  abortController: AbortController | null

  // Multi-file state
  parsedFiles: ParsedFile[]
  activeFileIndex: number
  setActiveFileIndex: (index: number) => void

  // Fullscreen editor mode
  isFullscreen: boolean
  toggleFullscreen: () => void

  // Refine feature state
  refineState: RefineState | null
  startRefine: () => void
  cancelRefine: () => void
  setRefineTone: (tone: Tone) => void
  setRefineAudience: (audience: Audience) => void
  executeRefine: () => Promise<void>
  applyRefinement: () => void
  rejectRefinement: () => void

  setInput: (partial: Partial<ForgeInput>) => void
  setContentType: (contentType: ContentType) => void
  setTone: (tone: Tone) => void
  setAudience: (audience: Audience) => void
  setLength: (length: ContentLength) => void
  setTopic: (topic: string) => void
  setWorkflow: (workflow: Workflow | null) => void
  setModel: (model: SelectedModel | null) => void
  generate: () => Promise<void>
  cancelGeneration: () => void
  reset: () => void
}

function makeTimestamp(): string {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
}

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
  selectedModel: null,
  dynamicStages: null,
  error: null,

  // SSE streaming state
  streamingContent: '',
  terminalLogs: [],
  abortController: null,

  // Multi-file state
  parsedFiles: [],
  activeFileIndex: 0,
  setActiveFileIndex: (index: number) => set({ activeFileIndex: index }),

  // Fullscreen
  isFullscreen: false,
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  // Refine state
  refineState: null,

  startRefine: () => {
    const { input, output, parsedFiles, activeFileIndex } = get()
    if (!output) return
    const activeContent = parsedFiles[activeFileIndex]?.content ?? output.content
    set({
      refineState: {
        originalContent: activeContent,
        refinedContent: '',
        isShowingDiff: false,
        isRefining: false,
        refineTone: input.tone,
        refineAudience: input.audience,
      },
    })
  },

  cancelRefine: () => set({ refineState: null }),

  setRefineTone: (tone: Tone) => {
    set((s) => ({
      refineState: s.refineState ? { ...s.refineState, refineTone: tone } : null,
    }))
  },

  setRefineAudience: (audience: Audience) => {
    set((s) => ({
      refineState: s.refineState ? { ...s.refineState, refineAudience: audience } : null,
    }))
  },

  executeRefine: async () => {
    const { input, refineState, parsedFiles, activeFileIndex, output } = get()
    if (!output || !refineState) return

    const activeContent = parsedFiles[activeFileIndex]?.content ?? output.content

    set((s) => ({
      refineState: s.refineState ? { ...s.refineState, isRefining: true } : null,
    }))

    try {
      // Do NOT pass workflowId — refinement should be a simple single-call, not a full pipeline re-run
      const historyItem = await generateContent({
        input: {
          ...input,
          tone: refineState.refineTone,
          audience: refineState.refineAudience,
          refineContent: activeContent,
          workflowId: undefined,
        },
      })

      set((s) => ({
        refineState: s.refineState
          ? {
              ...s.refineState,
              refinedContent: historyItem.output.content,
              isShowingDiff: true,
              isRefining: false,
            }
          : null,
      }))
    } catch (err) {
      set((s) => ({
        refineState: s.refineState ? { ...s.refineState, isRefining: false } : null,
        error: err instanceof Error ? err.message : 'Refinement failed. Please try again.',
      }))
    }
  },

  applyRefinement: () => {
    const { refineState, output, parsedFiles, activeFileIndex } = get()
    if (!refineState || !output) return

    const refined = refineState.refinedContent

    // If multi-file: update just the active file
    if (parsedFiles.length > 1) {
      const newFiles = [...parsedFiles]
      newFiles[activeFileIndex] = {
        ...newFiles[activeFileIndex],
        content: refined,
      }
      // Rebuild full content from all files
      const fullContent = newFiles
        .map((f) => `**${f.filename}**\n\n${f.content}`)
        .join('\n\n')
      const newMetrics = calculateMetrics(fullContent)
      set({
        output: { ...output, content: fullContent, metrics: newMetrics },
        parsedFiles: newFiles,
        refineState: null,
      })
    } else {
      const newMetrics = calculateMetrics(refined)
      const newFiles = parseMultiFileContent(refined)
      set({
        output: { ...output, content: refined, metrics: newMetrics },
        parsedFiles: newFiles,
        activeFileIndex: 0,
        refineState: null,
      })
    }
  },

  rejectRefinement: () => set({ refineState: null }),

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

  setModel: (model: SelectedModel | null) => {
    set({ selectedModel: model })
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
      parsedFiles: [],
      activeFileIndex: 0,
      refineState: null,
      isFullscreen: false,
      streamingContent: '',
      terminalLogs: [{ text: '[SYS] Initializing content pipeline...', time: makeTimestamp() }],
      abortController: null,
    })

    // Start SSE streaming generation
    const controller = generateContentStream(
      {
        input,
        workflowId: selectedWorkflow?.id,
      },
      {
        onAgentStart: (event) => {
          const { dynamicStages: currentStages } = get()
          if (!currentStages) return

          // Mark previous agents as completed, current as active
          const updatedStages = currentStages.map((s, i) => {
            if (i < event.agentIndex) return { ...s, status: 'completed' as const }
            if (i === event.agentIndex) return { ...s, status: 'active' as const }
            return { ...s, status: 'pending' as const }
          })

          set({
            dynamicStages: updatedStages,
            processingStage: updatedStages[event.agentIndex]?.id as ProcessingStageId,
            terminalLogs: [
              ...get().terminalLogs,
              {
                text: `[AI] Agent "${event.agentName}" starting... (${event.agentIndex + 1}/${event.totalAgents})`,
                time: makeTimestamp(),
              },
            ].slice(-30),
          })
        },

        onAgentComplete: (event) => {
          const { dynamicStages: currentStages } = get()
          if (!currentStages) return

          const updatedStages = currentStages.map((s, i) => {
            if (i <= event.agentIndex) return { ...s, status: 'completed' as const }
            return s
          })

          set({
            dynamicStages: updatedStages,
            terminalLogs: [
              ...get().terminalLogs,
              {
                text: `[PROC] Agent "${event.agentName}" completed (${event.tokenUsage.totalTokens.toLocaleString()} tokens)`,
                time: makeTimestamp(),
              },
            ].slice(-30),
          })
        },

        onToken: (event) => {
          set((s) => ({
            streamingContent: s.streamingContent + event.chunk,
            terminalLogs:
              // Only log token start once
              s.streamingContent.length === 0
                ? [
                    ...s.terminalLogs,
                    { text: '[AI] Streaming content tokens...', time: makeTimestamp() },
                  ].slice(-30)
                : s.terminalLogs,
          }))
        },

        onPipelineComplete: (event) => {
          const historyItem = {
            id: event.id,
            input: event.input,
            output: event.output,
            workflowName: event.workflowName,
            createdAt: event.createdAt,
          }

          const parsedFiles = parseMultiFileContent(historyItem.output.content)
          const { dynamicStages: currentStages } = get()

          // Mark all stages as completed
          const completedStages = currentStages?.map((s) => ({
            ...s,
            status: 'completed' as const,
          })) ?? null

          set({
            output: historyItem.output,
            parsedFiles,
            activeFileIndex: 0,
            isProcessing: false,
            processingStage: null,
            dynamicStages: completedStages,
            streamingContent: '',
            abortController: null,
            terminalLogs: [
              ...get().terminalLogs,
              { text: '[SYS] Pipeline complete. Output ready.', time: makeTimestamp() },
            ].slice(-30),
          })

          // Prepend to history
          useHistoryStore.getState().prependItem(historyItem)
        },

        onError: (event) => {
          set({
            isProcessing: false,
            processingStage: null,
            streamingContent: '',
            abortController: null,
            error: event.message,
            terminalLogs: [
              ...get().terminalLogs,
              { text: `[ERR] ${event.message}`, time: makeTimestamp() },
            ].slice(-30),
          })
        },
      },
    )

    set({ abortController: controller })
  },

  cancelGeneration: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
    }
    set({
      isProcessing: false,
      processingStage: null,
      streamingContent: '',
      abortController: null,
      error: null,
    })
  },

  reset: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
    }
    set({
      output: null,
      processingStage: null,
      isProcessing: false,
      dynamicStages: null,
      error: null,
      parsedFiles: [],
      activeFileIndex: 0,
      refineState: null,
      isFullscreen: false,
      streamingContent: '',
      terminalLogs: [],
      abortController: null,
    })
  },
}))
