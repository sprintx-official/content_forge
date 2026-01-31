import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { ImageCard } from './ImageCard'
import { ImageLightbox } from './ImageLightbox'
import type { GeneratedImage } from '@/types'

interface ImageGalleryProps {
  images: GeneratedImage[]
  isLoading: boolean
  isGenerating: boolean
  onDelete: (id: string) => void
}

export function ImageGallery({ images, isLoading, isGenerating, onDelete }: ImageGalleryProps) {
  const [viewImage, setViewImage] = useState<GeneratedImage | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    )
  }

  if (images.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
          <ImageIcon className="w-7 h-7 text-white/15" />
        </div>
        <p className="text-sm text-white/25">No images generated yet</p>
        <p className="text-xs text-white/15 mt-1">Describe an image to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Loading skeleton for current generation */}
        {isGenerating && (
          <div className="aspect-square rounded-xl bg-gradient-to-br from-[#00f0ff]/5 to-[#a855f7]/5 border border-white/[0.08] animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin mx-auto mb-2" />
              <span className="text-[10px] text-white/20 font-mono">GENERATING</span>
            </div>
          </div>
        )}

        {images.map((img) => (
          <ImageCard
            key={img.id}
            image={img}
            onDelete={onDelete}
            onView={setViewImage}
          />
        ))}
      </div>

      {/* Lightbox */}
      {viewImage && (
        <ImageLightbox
          image={viewImage}
          onClose={() => setViewImage(null)}
        />
      )}
    </>
  )
}
