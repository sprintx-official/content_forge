import { Zap, RotateCcw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import WorkflowSelector from './WorkflowSelector'
import ModelSelector from './ModelSelector'
import ContentTypeSelector from './ContentTypeSelector'
import ToneSelector from './ToneSelector'
import AudienceSelector from './AudienceSelector'
import LengthSelector from './LengthSelector'
import TopicInput from './TopicInput'

export default function InputPanel() {
  const topic = useForgeStore((s) => s.input.topic)
  const output = useForgeStore((s) => s.output)
  const isProcessing = useForgeStore((s) => s.isProcessing)
  const error = useForgeStore((s) => s.error)
  const generate = useForgeStore((s) => s.generate)
  const reset = useForgeStore((s) => s.reset)

  const isDisabled = topic.trim().length === 0 || isProcessing

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
      <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-white mb-6">
        Configure Your Content
      </h2>

      <div className="space-y-6">
        <WorkflowSelector />
        <ModelSelector />
        <ContentTypeSelector />
        <ToneSelector />
        <AudienceSelector />
        <LengthSelector />
        <TopicInput />

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={isDisabled}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'bg-[#00f0ff] text-[#0a0e1a] font-bold py-4 rounded-xl text-lg',
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
                'text-[#6b7280] hover:text-white text-sm py-2 rounded-xl transition-all',
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
