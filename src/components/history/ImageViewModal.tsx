import { useEffect, useState } from 'react'
import { X, Copy, Check, Download, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedImage } from '@/types'

interface ImageViewModalProps {
  image: GeneratedImage
  onClose: () => void
}

export default function ImageViewModal({ image, onClose }: ImageViewModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const formattedDate = new Date(image.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(image.prompt)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = image.prompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = image.url
    link.download = `image-${image.id}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const actionBtn = cn(
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium',
    'border border-white/10 bg-white/5 text-[#d1d5db]',
    'hover:bg-white/10 hover:text-white transition-all cursor-pointer',
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0a0e1a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 shrink-0">
              Image
            </span>
            <h3 className="text-lg font-semibold text-[#f9fafb] truncate">
              {image.prompt.slice(0, 80)}{image.prompt.length > 80 ? '...' : ''}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors shrink-0 ml-4 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 px-6 py-3 text-xs text-[#9ca3af] border-b border-white/5">
          <span>{formattedDate}</span>
          <span>{image.width}x{image.height}</span>
          <span className="capitalize">{image.style}</span>
          <span>{image.provider} / {image.model}</span>
          {image.costUsd > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <DollarSign className="h-3.5 w-3.5" />
              ${image.costUsd.toFixed(4)}
            </span>
          )}
        </div>

        {/* Image */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4">
          <img
            src={image.url}
            alt={image.prompt}
            className="max-w-full max-h-[60vh] rounded-xl object-contain"
          />
          <p className="text-sm text-[#9ca3af] leading-relaxed max-w-2xl text-center">
            {image.prompt}
          </p>
          {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
            <p className="text-xs text-white/30 leading-relaxed max-w-2xl text-center">
              <span className="font-medium text-white/40">Revised prompt:</span>{' '}
              {image.revisedPrompt}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-white/10">
          <button type="button" onClick={handleCopyPrompt} className={actionBtn}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Prompt
              </>
            )}
          </button>
          <button type="button" onClick={handleDownload} className={actionBtn}>
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  )
}
