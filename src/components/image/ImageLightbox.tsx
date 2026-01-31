import { useEffect } from 'react'
import { X, Download } from 'lucide-react'
import type { GeneratedImage } from '@/types'

interface ImageLightboxProps {
  image: GeneratedImage
  onClose: () => void
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleDownload = async () => {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls */}
        <div className="absolute -top-12 right-0 flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Image */}
        <img
          src={image.url}
          alt={image.prompt}
          className="max-w-full max-h-[80vh] rounded-xl object-contain"
        />

        {/* Info */}
        <div className="mt-4 text-center max-w-lg">
          <p className="text-sm text-white/60">{image.prompt}</p>
          {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
            <p className="text-xs text-white/30 mt-1">
              Revised: {image.revisedPrompt}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-white/25 font-mono">
            <span>{image.width}x{image.height}</span>
            <span>{image.model}</span>
            <span>${image.costUsd.toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
