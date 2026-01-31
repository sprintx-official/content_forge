import { useState } from 'react'
import { Download, Trash2, Expand } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedImage } from '@/types'

interface ImageCardProps {
  image: GeneratedImage
  onDelete: (id: string) => void
  onView: (image: GeneratedImage) => void
}

export function ImageCard({ image, onDelete, onView }: ImageCardProps) {
  const [loaded, setLoaded] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await fetch(image.url)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `image-${image.id.slice(0, 8)}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]',
        'cursor-pointer transition-all hover:border-[#00f0ff]/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.05)]',
      )}
      onClick={() => onView(image)}
    >
      {/* Image */}
      <div className="aspect-square relative bg-white/[0.02]">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.04] to-white/[0.02]" />
        )}
        <img
          src={image.url}
          alt={image.prompt}
          className={cn(
            'w-full h-full object-cover transition-opacity',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setLoaded(true)}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onView(image) }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="View full size"
          >
            <Expand className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(image.id) }}
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-white/50 line-clamp-2">{image.prompt}</p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-white/20 font-mono">
          <span>{image.width}x{image.height}</span>
          <span>&middot;</span>
          <span>{image.style}</span>
        </div>
      </div>
    </div>
  )
}
