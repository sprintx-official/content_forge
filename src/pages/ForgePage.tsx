import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import InputPanel from '@/components/forge/InputPanel'
import { ProcessingView } from '@/components/processing/ProcessingView'
import OutputPanel from '@/components/output/OutputPanel'
import { FeedbackButton, FeedbackModal } from '@/components/forge/FeedbackModal'
import { ForgeTabBar } from '@/components/forge/ForgeTabBar'
import { ChatView } from '@/components/chat/ChatView'
import { ImageView } from '@/components/image/ImageView'
import { CodeView } from '@/components/code/CodeView'
import type { ContentType, ForgeMode } from '@/types'

export default function ForgePage() {
  const { isProcessing, output, error, setContentType, reset } = useForgeStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // Tab state from URL (default: content)
  const modeParam = searchParams.get('mode') as ForgeMode | null
  const [activeTab, setActiveTab] = useState<ForgeMode>(
    modeParam && ['content', 'chat', 'image', 'code'].includes(modeParam)
      ? modeParam
      : 'content',
  )

  const handleTabChange = useCallback(
    (mode: ForgeMode) => {
      setActiveTab(mode)
      setSearchParams(mode === 'content' ? {} : { mode })
    },
    [setSearchParams],
  )

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

  // Only show tabs when on the Content tab idle state, OR when on a non-content tab
  const showTabs = activeTab !== 'content' || (!isProcessing && !output && !showError)

  return (
    <div className="py-8 px-4">
      {/* Tab bar */}
      {showTabs && (
        <div className="max-w-4xl mx-auto">
          <ForgeTabBar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      )}

      {/* Content tab */}
      {activeTab === 'content' && (
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
      )}

      {/* Chat tab */}
      {activeTab === 'chat' && <ChatView />}

      {/* Image tab */}
      {activeTab === 'image' && <ImageView />}

      {/* Code tab */}
      {activeTab === 'code' && <CodeView />}

      <FeedbackButton />
      <FeedbackModal />
    </div>
  )
}
