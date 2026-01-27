import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import InputPanel from '@/components/forge/InputPanel'
import { ProcessingView } from '@/components/processing/ProcessingView'
import OutputPanel from '@/components/output/OutputPanel'
import { FeedbackButton, FeedbackModal } from '@/components/forge/FeedbackModal'
import type { ContentType } from '@/types'

export default function ForgePage() {
  const { isProcessing, output, error, setContentType, reset } = useForgeStore()
  const [searchParams] = useSearchParams()

  // Pre-select content type from URL params (from landing page cards)
  useEffect(() => {
    const type = searchParams.get('type')
    if (type) {
      setContentType(type as ContentType)
    }
  }, [searchParams, setContentType])

  // Scroll to top only once when transitioning from idle to a new view state
  const prevViewRef = useRef<string>('idle')
  useEffect(() => {
    const view = isProcessing ? 'processing' : output ? 'output' : error ? 'error' : 'idle'
    if (view !== 'idle' && view !== prevViewRef.current) {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    prevViewRef.current = view
  }, [isProcessing, output, error])

  const showError = !!error && !isProcessing && !output

  return (
    <div className="py-8 px-4">
      {/* Three-state view with transitions */}
      <div className="relative">
        {/* Input State */}
        <div
          className={`transition-all duration-500 ${
            isProcessing || output || showError
              ? 'opacity-0 scale-95 pointer-events-none absolute inset-0'
              : 'opacity-100 scale-100'
          }`}
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold font-['Space_Grotesk'] bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent mb-3">
                Content Forge
              </h1>
              <p className="text-[#9ca3af] text-lg">
                Configure your content and let our AI agents do the work
              </p>
            </div>
            <InputPanel />
          </div>
        </div>

        {/* Processing State */}
        <div
          className={`transition-all duration-500 ${
            isProcessing
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none absolute inset-0'
          }`}
        >
          <ProcessingView />
        </div>

        {/* Error State */}
        <div
          className={`transition-all duration-500 ${
            showError
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none absolute inset-0'
          }`}
        >
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-[#f9fafb] mb-3">Generation Failed</h2>
            <p className="text-[#9ca3af] mb-6">{error}</p>
            <button
              type="button"
              onClick={reset}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium',
                'bg-[#00f0ff] text-[#0a0e1a] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)] transition-all',
              )}
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>

        {/* Output State */}
        <div
          className={`transition-all duration-500 ${
            output && !isProcessing
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none absolute inset-0'
          }`}
        >
          <div className="max-w-4xl mx-auto">
            <OutputPanel />
          </div>
        </div>
      </div>

      <FeedbackButton />
      <FeedbackModal />
    </div>
  )
}
