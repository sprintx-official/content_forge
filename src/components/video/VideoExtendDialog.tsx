import { useState, useEffect } from 'react'
import { X, Loader2, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedVideo } from '@/types'

interface VideoExtendDialogProps {
  video: GeneratedVideo
  isExtending: boolean
  onExtend: (sourceVideoId: string, prompt: string) => void
  onClose: () => void
}

export function VideoExtendDialog({ video, isExtending, onExtend, onClose }: VideoExtendDialogProps) {
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExtending) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isExtending])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isExtending) return
    onExtend(video.id, prompt.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isExtending) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0e1a] p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#f9fafb] flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#00f0ff]" />
              Extend Video
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={isExtending}
              className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-xs text-white/40 line-clamp-2">
            Extending: &ldquo;{video.prompt}&rdquo;
          </p>

          <div>
            <label className="block text-xs font-medium text-white/40 mb-2">
              Continuation prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Continue seamlessly from the previous clip. Describe what happens next..."
              rows={4}
              className={cn(
                'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3',
                'text-sm text-white/80 placeholder:text-white/20',
                'focus:outline-none focus:border-[#00f0ff]/30 focus:ring-1 focus:ring-[#00f0ff]/20',
                'resize-none',
              )}
              disabled={isExtending}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isExtending}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all',
              prompt.trim() && !isExtending
                ? 'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-[#0a0e1a] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]'
                : 'bg-white/[0.06] text-white/20 cursor-not-allowed',
            )}
          >
            {isExtending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Extend Scene
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
