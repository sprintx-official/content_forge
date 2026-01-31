import { Trash2, Eye, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedImage } from '@/types'

interface ImageHistoryCardProps {
  image: GeneratedImage
  onDelete: (id: string) => void
  onView: (image: GeneratedImage) => void
}

export default function ImageHistoryCard({ image, onDelete, onView }: ImageHistoryCardProps) {
  const formattedDate = new Date(image.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this image? This cannot be undone.')
    if (confirmed) onDelete(image.id)
  }

  return (
    <div
      className={cn(
        'bg-white/5 border border-white/10 rounded-xl overflow-hidden',
        'hover:border-white/20 transition-all relative group cursor-pointer',
      )}
      onClick={() => onView(image)}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={cn(
          'absolute top-4 right-4 z-10',
          'text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100',
          'transition-opacity cursor-pointer',
        )}
        aria-label="Delete image"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Image thumbnail */}
      <div className="relative aspect-video bg-white/[0.02] overflow-hidden">
        <img
          src={image.url}
          alt={image.prompt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 text-sm text-white font-medium">
            <Eye className="h-4 w-4" />
            View
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Top row: type badge + date */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
            Image
          </span>
          <span className="text-xs text-[#6b7280]">{formattedDate}</span>
        </div>

        {/* Prompt */}
        <p className="text-sm text-[#9ca3af] line-clamp-2 mb-3 leading-relaxed">
          {image.prompt}
        </p>

        {/* Bottom row */}
        <div className="flex items-center gap-4 text-xs text-[#9ca3af]">
          <span>{image.width}x{image.height}</span>
          <span className="capitalize">{image.style}</span>
          <span className="text-white/30">{image.model}</span>
          {image.costUsd > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <DollarSign className="h-3.5 w-3.5" />
              ${image.costUsd.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
