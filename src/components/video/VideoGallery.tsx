import { Video } from 'lucide-react'
import { VideoCard } from './VideoCard'
import type { GeneratedVideo } from '@/types'

interface VideoGalleryProps {
  videos: GeneratedVideo[]
  isLoading: boolean
  isGenerating: boolean
  onDelete: (id: string) => void
  onExtend: (video: GeneratedVideo) => void
}

export function VideoGallery({ videos, isLoading, isGenerating, onDelete, onExtend }: VideoGalleryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    )
  }

  if (videos.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
          <Video className="w-7 h-7 text-white/15" />
        </div>
        <p className="text-sm text-white/25">No videos generated yet</p>
        <p className="text-xs text-white/15 mt-1">Describe a scene to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Loading skeleton for current generation */}
      {isGenerating && (
        <div className="aspect-video rounded-xl bg-gradient-to-br from-[#10b981]/5 to-[#6366f1]/5 border border-white/[0.08] animate-pulse flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin mx-auto mb-2" />
            <span className="text-[10px] text-white/20 font-mono">GENERATING VIDEO</span>
            <p className="text-[10px] text-white/10 mt-1">This may take a few minutes</p>
          </div>
        </div>
      )}

      {videos.map((v) => (
        <VideoCard key={v.id} video={v} onDelete={onDelete} onExtend={onExtend} />
      ))}
    </div>
  )
}
