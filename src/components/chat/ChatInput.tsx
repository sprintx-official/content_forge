import { useState, useRef, useCallback } from 'react'
import { Send, Square, Paperclip, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string, files?: File[]) => void
  onCancel?: () => void
  isStreaming: boolean
  placeholder?: string
}

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

export function ChatInput({ onSend, onCancel, isStreaming, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [objectUrls, setObjectUrls] = useState<Map<File, string>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateObjectUrls = useCallback((newFiles: File[]) => {
    setObjectUrls((prev) => {
      const next = new Map<File, string>()
      newFiles.forEach((f) => {
        if (isImageFile(f)) {
          const existing = prev.get(f)
          if (existing) {
            next.set(f, existing)
          } else {
            next.set(f, URL.createObjectURL(f))
          }
        }
      })
      // Revoke removed
      prev.forEach((url, file) => {
        if (!next.has(file)) URL.revokeObjectURL(url)
      })
      return next
    })
  }, [])

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const combined = [...prev, ...incoming].slice(0, 10)
      updateObjectUrls(combined)
      return combined
    })
  }, [updateObjectUrls])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      updateObjectUrls(next)
      return next
    })
  }, [updateObjectUrls])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && files.length === 0) || isStreaming) return
    onSend(trimmed || '(attached files)', files.length > 0 ? files : undefined)
    setValue('')
    setFiles([])
    setObjectUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url))
      return new Map()
    })
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, files, isStreaming, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) {
      addFiles(imageFiles)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    addFiles(dropped)
  }

  return (
    <div
      className={cn(
        'border-t border-white/[0.06] bg-white/[0.02] transition-colors',
        isDragging && 'bg-[#10b981]/5 border-[#10b981]/20',
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="group/file relative flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5"
            >
              {isImageFile(file) ? (
                <img
                  src={objectUrls.get(file) ?? ''}
                  alt={file.name}
                  className="h-8 w-8 shrink-0 rounded object-cover"
                />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-[#94a3b8]" />
              )}
              <div className="min-w-0 max-w-[120px]">
                <p className="truncate text-xs text-white/70">{file.name}</p>
                <p className="text-[10px] text-white/30">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 rounded p-0.5 text-white/30 hover:bg-white/[0.08] hover:text-red-400 transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        {/* Paperclip button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-colors"
          title="Attach files"
          disabled={isStreaming}
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          onChange={(e) => {
            if (e.target.files) {
              addFiles(Array.from(e.target.files))
              e.target.value = ''
            }
          }}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={placeholder || 'Type a message... (Shift+Enter for new line)'}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5',
            'text-sm text-white/80 placeholder:text-white/25',
            'focus:outline-none focus:border-[#10b981]/30 focus:ring-1 focus:ring-[#10b981]/20',
            'scrollbar-thin scrollbar-thumb-white/10',
          )}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="shrink-0 p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() && files.length === 0}
            className={cn(
              'shrink-0 p-2.5 rounded-xl transition-all',
              value.trim() || files.length > 0
                ? 'bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/30'
                : 'bg-white/[0.04] border border-white/[0.06] text-white/20 cursor-not-allowed',
            )}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
