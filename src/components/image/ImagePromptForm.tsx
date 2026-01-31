import { Loader2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useImageStore } from '@/stores/useImageStore'
import { IMAGE_SIZES, IMAGE_STYLES } from '@/constants'
import ModelSelector from '@/components/forge/ModelSelector'
import type { ImageSize, ImageStyle } from '@/types'

export function ImagePromptForm() {
  const {
    prompt,
    selectedSize,
    selectedStyle,
    isGenerating,
    setPrompt,
    setSize,
    setStyle,
    generate,
  } = useImageStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Prompt */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">
          Describe your image
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A serene mountain landscape at sunset with golden hour lighting..."
          rows={4}
          className={cn(
            'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3',
            'text-sm text-white/80 placeholder:text-white/20',
            'focus:outline-none focus:border-[#00f0ff]/30 focus:ring-1 focus:ring-[#00f0ff]/20',
            'resize-none',
          )}
          disabled={isGenerating}
        />
      </div>

      {/* Style */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">Style</label>
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id as ImageStyle)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                selectedStyle === s.id
                  ? 'bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff]'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">Size</label>
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_SIZES.map((s: ImageSize) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSize(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                selectedSize.label === s.label
                  ? 'bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#a855f7]'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60',
              )}
            >
              {s.label}
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
            <Wand2 className="w-4 h-4" />
            Generate Image
          </>
        )}
      </button>
    </form>
  )
}
