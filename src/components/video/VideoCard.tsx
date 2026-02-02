import { Download, Trash2, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedVideo } from '@/types'

interface VideoCardProps {
  video: GeneratedVideo
  onDelete: (id: string) => void
  onExtend: (video: GeneratedVideo) => void
}

export function VideoCard({ video, onDelete, onExtend }: VideoCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await fetch(video.url)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video-${video.id.slice(0, 8)}.mp4`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]',
        'transition-all hover:border-[#00f0ff]/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.05)]',
      )}
    >
      {/* Video */}
      <div className="aspect-video relative bg-black/40">
        <video
          src={video.url}
          className="w-full h-full object-cover"
          controls
          preload="metadata"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onExtend(video) }}
              className="p-2 rounded-lg bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 transition-colors"
              title="Extend scene"
            >
              <Link2 className="w-4 h-4 text-[#00f0ff]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(video.id) }}
              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-white/50 line-clamp-2">{video.prompt}</p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-white/20 font-mono">
          <span>{video.aspectRatio}</span>
          <span>&middot;</span>
          <span>{video.durationSeconds}s</span>
          <span>&middot;</span>
          <span>{video.model}</span>
          {video.sourceVideoId && (
            <>
              <span>&middot;</span>
              <span className="inline-flex items-center gap-0.5 text-[#00f0ff]/50" title="Extended clip">
                <Link2 className="w-3 h-3" />
                clip {video.clipIndex}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
