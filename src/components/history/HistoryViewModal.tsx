import { useState, useCallback, useRef, useEffect } from 'react'
import {
  X,
  Save,
  Copy,
  Check,
  FileDown,
  FileCode,
  Printer,
  FileText,
  BarChart3,
  Clock,
  Cpu,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ContentDisplay from '@/components/output/ContentDisplay'
import { useHistoryStore } from '@/stores/useHistoryStore'
import type { HistoryItem } from '@/types'
import type { Editor } from '@tiptap/react'

interface HistoryViewModalProps {
  item: HistoryItem
  onClose: () => void
}

const TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-500/20 text-blue-400',
  blog: 'bg-green-500/20 text-green-400',
  social: 'bg-pink-500/20 text-pink-400',
  press: 'bg-amber-500/20 text-amber-400',
  script: 'bg-violet-500/20 text-violet-400',
  'ad-copy': 'bg-orange-500/20 text-orange-400',
}

export default function HistoryViewModal({ item, onClose }: HistoryViewModalProps) {
  const editorRef = useRef<Editor | null>(null)
  const updateItem = useHistoryStore((s) => s.updateItem)

  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { input, output, createdAt } = item
  const { metrics } = output

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const getPlainText = useCallback(() => {
    return editorRef.current?.getText() ?? output.content
  }, [output.content])

  const getHTML = useCallback(() => {
    return editorRef.current?.getHTML() ?? output.content
  }, [output.content])

  const handleSave = async () => {
    const text = getPlainText()
    if (!text) return
    setSaving(true)
    await updateItem(item.id, text)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCopy = async () => {
    const text = getPlainText()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadTxt = () => {
    const blob = new Blob([getPlainText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'content-forge-output.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Content Forge Output</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1f2937; }
  h1 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
  h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  p { margin-bottom: 1rem; }
  ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; margin: 0 0 1rem; font-style: italic; color: #6b7280; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  code { background: #f3f4f6; border-radius: 0.25rem; padding: 0.125rem 0.375rem; font-size: 0.875em; }
  pre { background: #f3f4f6; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; }
  pre code { background: none; padding: 0; }
</style>
</head>
<body>
${getHTML()}
</body>
</html>`
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'content-forge-output.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      window.print()
      return
    }
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Content Forge Output</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1f2937; }
  h1 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
  h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  p { margin-bottom: 1rem; }
  ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; margin: 0 0 1rem; font-style: italic; color: #6b7280; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  code { background: #f3f4f6; border-radius: 0.25rem; padding: 0.125rem 0.375rem; font-size: 0.875em; }
  pre { background: #f3f4f6; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; }
  pre code { background: none; padding: 0; }
</style>
</head>
<body>
${getHTML()}
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
            <span
              className={cn(
                'text-xs font-medium px-2.5 py-0.5 rounded-full capitalize shrink-0',
                TYPE_COLORS[input.contentType] ?? 'bg-white/10 text-white/60',
              )}
            >
              {input.contentType}
            </span>
            {item.workflowName && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#a855f7]/20 text-[#a855f7] shrink-0">
                {item.workflowName}
              </span>
            )}
            <h3 className="text-lg font-semibold text-[#f9fafb] truncate">{input.topic}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors shrink-0 ml-4 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-4 px-6 py-3 text-xs text-[#9ca3af] border-b border-white/5">
          <span>{formattedDate}</span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {metrics.wordCount} words
          </span>
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            {metrics.readabilityScore}/100
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {metrics.readTimeMinutes} min read
          </span>
          {output.tokenUsage && (
            <>
              <span className="inline-flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5" />
                {output.tokenUsage.totalTokens.toLocaleString()} tokens
              </span>
              <span className="inline-flex items-center gap-1 text-[#d1d5db]">
                {output.tokenUsage.model}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <DollarSign className="h-3.5 w-3.5" />
                ${output.tokenUsage.costUsd.toFixed(4)}
              </span>
            </>
          )}
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto p-6">
          <ContentDisplay content={output.content} onEditorReady={handleEditorReady} />
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-white/10">
          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium',
              'border border-[#00f0ff] text-[#00f0ff] bg-transparent',
              'hover:bg-[#00f0ff]/10 transition-all cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save'}
              </>
            )}
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Copy */}
          <button type="button" onClick={handleCopy} className={actionBtn}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>

          {/* Download TXT */}
          <button type="button" onClick={handleDownloadTxt} className={actionBtn}>
            <FileDown className="h-3.5 w-3.5" />
            TXT
          </button>

          {/* Download HTML */}
          <button type="button" onClick={handleDownloadHTML} className={actionBtn}>
            <FileCode className="h-3.5 w-3.5" />
            HTML
          </button>

          {/* Print */}
          <button type="button" onClick={handlePrint} className={actionBtn}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>
    </div>
  )
}
