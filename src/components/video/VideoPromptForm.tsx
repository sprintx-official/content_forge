import { Loader2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVideoStore, VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS } from '@/stores/useVideoStore'
import { VideoModelSelector } from './VideoModelSelector'
import type { VideoAspectRatio } from '@/stores/useVideoStore'

export function VideoPromptForm() {
  const {
    prompt,
    selectedAspectRatio,
    selectedDuration,
    isGenerating,
    progress,
    setPrompt,
    setAspectRatio,
    setDuration,
    generate,
  } = useVideoStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Prompt */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">
          Describe your video
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A drone shot flying over a misty mountain valley at sunrise, cinematic lighting..."
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

      {/* Aspect Ratio */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">Aspect Ratio</label>
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_ASPECT_RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setAspectRatio(r.id as VideoAspectRatio)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                selectedAspectRatio === r.id
                  ? 'bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff]'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">Duration</label>
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_DURATIONS.map((d) => (
            <button
              key={d.seconds}
              type="button"
              onClick={() => setDuration(d.seconds)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                selectedDuration === d.seconds
                  ? 'bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#a855f7]'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video Model Selector */}
      <VideoModelSelector />

      {/* Progress */}
      {isGenerating && progress && (
        <div className="px-3 py-2 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/10 text-xs text-[#00f0ff]/70 font-mono">
          {progress}
        </div>
      )}

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
            Generating Video...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Generate Video
          </>
        )}
      </button>
    </form>
  )
}
