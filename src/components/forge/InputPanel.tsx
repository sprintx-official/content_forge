import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, RotateCcw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import { useAdminStore } from '@/stores/useAdminStore'
import WorkflowSelector from './WorkflowSelector'
import ContentTypeSelector from './ContentTypeSelector'
import ToneSelector from './ToneSelector'
import AudienceSelector from './AudienceSelector'
import LengthSelector from './LengthSelector'
import TopicInput from './TopicInput'

interface InputPanelProps {
  hideWorkflowSelector?: boolean
  workflowId?: string
}

export default function InputPanel({ hideWorkflowSelector, workflowId }: InputPanelProps) {
  const navigate = useNavigate()
  const topic = useForgeStore((s) => s.input.topic)
  const output = useForgeStore((s) => s.output)
  const isProcessing = useForgeStore((s) => s.isProcessing)
  const error = useForgeStore((s) => s.error)
  const generate = useForgeStore((s) => s.generate)
  const reset = useForgeStore((s) => s.reset)
  const setWorkflow = useForgeStore((s) => s.setWorkflow)
  const selectedWorkflow = useForgeStore((s) => s.selectedWorkflow)

  // When workflowId prop is provided, load and set the workflow in the store
  const workflows = useAdminStore((s) => s.workflows)
  const loadWorkflows = useAdminStore((s) => s.loadWorkflows)

  useEffect(() => {
    if (workflowId && !selectedWorkflow) {
      loadWorkflows().then(() => {
        const wf = useAdminStore.getState().workflows.find((w) => w.id === workflowId)
        if (wf) setWorkflow(wf)
      })
    }
  }, [workflowId, selectedWorkflow, loadWorkflows, setWorkflow])

  // Also sync if workflows already loaded
  useEffect(() => {
    if (workflowId && !selectedWorkflow && workflows.length > 0) {
      const wf = workflows.find((w) => w.id === workflowId)
      if (wf) setWorkflow(wf)
    }
  }, [workflowId, selectedWorkflow, workflows, setWorkflow])

  const isDisabled = topic.trim().length === 0 || isProcessing

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isDisabled) {
          generate()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDisabled, generate])

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
      <h2 className="text-lg font-medium text-white/70 mb-6">
        Configure Your Content
      </h2>

      <div className="space-y-6">
        {!hideWorkflowSelector && <WorkflowSelector />}
        <ContentTypeSelector />
        <ToneSelector />
        <AudienceSelector />
        <LengthSelector />
        <TopicInput />

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {/quota|credit|billing|balance|exhausted|No other AI provider/i.test(error) && (
              <button
                type="button"
                onClick={() => { navigate('/settings'); useAdminStore.getState().setActiveTab('api-keys') }}
                className="ml-6 text-xs text-[#10b981] hover:text-[#10b981]/80 underline underline-offset-2"
              >
                Go to API Keys settings to check provider status or add more providers
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={isDisabled}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'bg-[#10b981] text-[#0f172a] font-bold py-4 rounded-xl text-lg',
              'transition-all hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Zap className="w-5 h-5" />
            {isProcessing ? 'Generating...' : 'Generate Content'}
          </button>

          {output && (
            <button
              type="button"
              onClick={reset}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'text-[#94a3b8] hover:text-white text-sm py-2 rounded-xl transition-all',
                'hover:bg-white/5'
              )}
            >
              <RotateCcw className="w-4 h-4" />
              Clear Output
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
