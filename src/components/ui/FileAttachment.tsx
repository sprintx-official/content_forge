import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Paperclip, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileAttachmentProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  compact?: boolean
}

const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'text/csv',
]

const ACCEPT_STRING =
  '.png,.jpg,.jpeg,.gif,.webp,.pdf,.docx,.doc,.txt,.md,.csv'

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileAttachment({
  files,
  onFilesChange,
  maxFiles = 10,
  compact = false,
}: FileAttachmentProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [objectUrls, setObjectUrls] = useState<Map<File, string>>(new Map())

  // Create object URLs for image previews
  useEffect(() => {
    const newUrls = new Map<File, string>()
    files.forEach((file) => {
      if (isImageFile(file)) {
        const existing = objectUrls.get(file)
        if (existing) {
          newUrls.set(file, existing)
        } else {
          newUrls.set(file, URL.createObjectURL(file))
        }
      }
    })

    // Revoke URLs that are no longer in use
    objectUrls.forEach((url, file) => {
      if (!newUrls.has(file)) {
        URL.revokeObjectURL(url)
      }
    })

    setObjectUrls(newUrls)

    // Cleanup all URLs on unmount
    return () => {
      newUrls.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const addFiles = useCallback(
    (incoming: File[]) => {
      const filtered = incoming.filter(
        (f) =>
          ACCEPTED_TYPES.includes(f.type) ||
          ACCEPT_STRING.split(',').some((ext) =>
            f.name.toLowerCase().endsWith(ext)
          )
      )
      const combined = [...files, ...filtered].slice(0, maxFiles)
      onFilesChange(combined)
    },
    [files, maxFiles, onFilesChange]
  )

  const removeFile = useCallback(
    (index: number) => {
      const next = files.filter((_, i) => i !== index)
      onFilesChange(next)
    },
    [files, onFilesChange]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const dropped = Array.from(e.dataTransfer.files)
      addFiles(dropped)
    },
    [addFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files))
        e.target.value = ''
      }
    },
    [addFiles]
  )

  const handleZoneClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleZoneClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleZoneClick()
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed transition-all duration-200',
          compact ? 'px-3 py-2' : 'px-4 py-6',
          isDragging
            ? 'border-[#10b981] bg-[#10b981]/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
          files.length >= maxFiles && 'pointer-events-none opacity-40'
        )}
      >
        <Paperclip
          className={cn(
            'shrink-0',
            compact ? 'h-4 w-4' : 'h-5 w-5',
            isDragging ? 'text-[#10b981]' : 'text-[#94a3b8]'
          )}
        />
        <span
          className={cn(
            'select-none',
            compact ? 'text-xs' : 'text-sm',
            isDragging ? 'text-[#10b981]' : 'text-[#94a3b8]'
          )}
        >
          Drop files here or click to browse
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_STRING}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
            >
              {/* Thumbnail or icon */}
              {isImageFile(file) ? (
                <img
                  src={objectUrls.get(file) ?? ''}
                  alt={file.name}
                  className="h-12 w-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/[0.06]">
                  <FileText className="h-5 w-5 text-[#94a3b8]" />
                </div>
              )}

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#f8fafc]">{file.name}</p>
                <p className="text-xs text-[#94a3b8]">
                  {formatFileSize(file.size)}
                </p>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 rounded-md p-1 text-[#94a3b8] transition-colors hover:bg-white/[0.06] hover:text-red-400"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
