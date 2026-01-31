import { useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { useCodeStore } from '@/stores/useCodeStore'
import { CodePromptForm } from './CodePromptForm'
import { CodeOutput } from './CodeOutput'

export function CodeView() {
  const { error, cancelGeneration, isGenerating } = useCodeStore()

  useEffect(() => {
    return () => {
      // Cancel any in-flight generation on unmount
      if (isGenerating) cancelGeneration()
    }
  }, [isGenerating, cancelGeneration])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button
            onClick={() => useCodeStore.setState({ error: null })}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left: Form */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <CodePromptForm />
        </div>

        {/* Right: Output */}
        <div className="min-h-[500px] flex flex-col">
          <CodeOutput />
        </div>
      </div>
    </div>
  )
}
