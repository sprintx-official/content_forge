import { useRef, useState, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { KnowledgeBaseFile } from '@/types'

const ACCEPTED_TYPES = '.txt,.md,.pdf,.doc,.docx'

interface FileUploadPanelProps {
  agentId?: string
  files: KnowledgeBaseFile[]
  onChange: (files: KnowledgeBaseFile[]) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function FileUploadPanel({ agentId, files, onChange }: FileUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const processFiles = useCallback(
    async (fileList: FileList) => {
      if (!agentId) {
        setError('Save the agent first before uploading files.')
        return
      }

      setError('')
      setUploading(true)

      const newFiles: KnowledgeBaseFile[] = []

      for (const file of Array.from(fileList)) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        if (!['txt', 'md', 'pdf', 'doc', 'docx'].includes(ext)) {
          setError(`Unsupported file type: .${ext}`)
          continue
        }

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('agentId', agentId)

          const uploaded = await api.upload<KnowledgeBaseFile>('/api/files/upload', formData)
          newFiles.push(uploaded)
        } catch {
          setError(`Could not upload file: ${file.name}`)
        }
      }

      if (newFiles.length > 0) {
        onChange([...files, ...newFiles])
      }

      setUploading(false)
    },
    [agentId, files, onChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles],
  )

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/api/files/${id}`)
      onChange(files.filter((f) => f.id !== id))
    } catch {
      setError('Failed to delete file.')
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#9ca3af]">
        Knowledge Base Files
      </label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-all duration-200',
          dragging
            ? 'border-[#00f0ff]/60 bg-[#00f0ff]/5'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20',
          uploading && 'pointer-events-none opacity-50',
        )}
      >
        <Upload className="h-6 w-6 text-[#9ca3af]" />
        <p className="text-sm text-[#9ca3af]">
          {uploading ? 'Uploading...' : (
            <>Drag & drop files here or <span className="text-[#00f0ff] underline">browse</span></>
          )}
        </p>
        <p className="text-xs text-[#6b7280]">.txt, .md, .pdf, .doc, .docx</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files)
              e.target.value = ''
            }
          }}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-[#00f0ff]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#f9fafb]">{file.name}</p>
                <p className="text-xs text-[#6b7280]">
                  {formatSize(file.size)} &middot;{' '}
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(file.id)}
                className="text-[#9ca3af] hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
