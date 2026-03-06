import { useEffect } from 'react'
import { useImageStore } from '@/stores/useImageStore'
import { ImagePromptForm } from './ImagePromptForm'
import { ImageGallery } from './ImageGallery'

export function ImageView() {
  const {
    images,
    isGenerating,
    isLoadingImages,
    error,
    loadImages,
    deleteImage,
    clearError,
  } = useImageStore()

  useEffect(() => {
    loadImages()
  }, [loadImages])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white/90 mb-1">
          Image Generator
        </h1>
        <p className="text-sm text-white/40">
          Create images with AI powered by DALL-E
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
          <ImagePromptForm />
        </div>

        {/* Right: Gallery */}
        <div>
          <ImageGallery
            images={images}
            isLoading={isLoadingImages}
            isGenerating={isGenerating}
            onDelete={deleteImage}
          />
        </div>
      </div>
    </div>
  )
}
