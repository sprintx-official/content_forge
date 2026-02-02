import { useEffect, useState } from 'react'
import { useVideoStore } from '@/stores/useVideoStore'
import { VideoPromptForm } from './VideoPromptForm'
import { VideoGallery } from './VideoGallery'
import { VideoExtendDialog } from './VideoExtendDialog'
import type { GeneratedVideo } from '@/types'

export function VideoView() {
  const {
    videos,
    isGenerating,
    isLoadingVideos,
    isExtending,
    error,
    loadVideos,
    deleteVideo,
    extendVideo,
    clearError,
  } = useVideoStore()

  const [extendingVideo, setExtendingVideo] = useState<GeneratedVideo | null>(null)

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bold font-['Space_Grotesk'] bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent mb-3">
          AI Video Generator
        </h1>
        <p className="text-[#9ca3af] text-lg">
          Create videos with AI powered by Google Veo
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400/50 hover:text-red-400 text-xs">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left: Form */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a1a]/60 p-5">
          <VideoPromptForm />
        </div>

        {/* Right: Gallery */}
        <div>
          <VideoGallery
            videos={videos}
            isLoading={isLoadingVideos}
            isGenerating={isGenerating}
            onDelete={deleteVideo}
            onExtend={(video) => setExtendingVideo(video)}
          />
        </div>
      </div>

      {/* Extend dialog */}
      {extendingVideo && (
        <VideoExtendDialog
          video={extendingVideo}
          isExtending={isExtending}
          onExtend={(sourceVideoId, prompt) => {
            extendVideo(sourceVideoId, prompt).then(() => setExtendingVideo(null))
          }}
          onClose={() => setExtendingVideo(null)}
        />
      )}
    </div>
  )
}
