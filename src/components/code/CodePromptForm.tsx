import { Loader2, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCodeStore } from '@/stores/useCodeStore'
import { CODE_LANGUAGES } from '@/constants'
import ModelSelector from '@/components/forge/ModelSelector'
import type { CodeLanguage } from '@/types'

export function CodePromptForm() {
  const {
    prompt,
    language,
    isGenerating,
    setPrompt,
    setLanguage,
    generate,
  } = useCodeStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Prompt */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">
          Describe what you need
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A function that validates email addresses using regex..."
          rows={6}
          className={cn(
            'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3',
            'text-sm text-white/80 placeholder:text-white/20',
            'focus:outline-none focus:border-[#00f0ff]/30 focus:ring-1 focus:ring-[#00f0ff]/20',
            'resize-none font-mono',
          )}
          disabled={isGenerating}
        />
      </div>

      {/* Language */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">Language</label>
        <div className="flex flex-wrap gap-1.5">
          {CODE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => setLanguage(lang.id as CodeLanguage)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                language === lang.id
                  ? 'bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff]'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60',
              )}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* AI Model */}
      <ModelSelector />

      {/* Generate button */}
      <button
        type="submit"
        disabled={!prompt.trim() || isGenerating}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all',
          prompt.trim() && !isGenerating
            ? 'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-[#0a0e1a] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]'
            : 'bg-white/[0.06] text-white/20 cursor-not-allowed',
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Code2 className="w-4 h-4" />
            Generate Code
          </>
        )}
      </button>
    </form>
  )
}
