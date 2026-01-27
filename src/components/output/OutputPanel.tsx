import { useCallback, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import ContentDisplay from '@/components/output/ContentDisplay'
import MetricsCards from '@/components/output/MetricsCards'
import WritingTips from '@/components/output/WritingTips'
import ExportActions from '@/components/output/ExportActions'
import type { Editor } from '@tiptap/react'

export default function OutputPanel() {
  const output = useForgeStore((s) => s.output)
  const contentType = useForgeStore((s) => s.input.contentType)
  const generate = useForgeStore((s) => s.generate)
  const reset = useForgeStore((s) => s.reset)
  const editorRef = useRef<Editor | null>(null)

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const getPlainText = useCallback(() => {
    return editorRef.current?.getText() ?? output?.content ?? ''
  }, [output])

  const getHTML = useCallback(() => {
    return editorRef.current?.getHTML() ?? output?.content ?? ''
  }, [output])

  if (!output) return null

  return (
    <div className="space-y-6 animate-[fadeIn_0.6s_ease-out_both]">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-[#00f0ff]" />
        <h2
          className={cn(
            'text-2xl md:text-3xl font-bold',
            'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent',
          )}
        >
          Your Content is Ready
        </h2>
      </div>

      {/* Generated content */}
      <ContentDisplay content={output.content} onEditorReady={handleEditorReady} />

      {/* Metrics */}
      <MetricsCards metrics={output.metrics} tokenUsage={output.tokenUsage} />

      {/* Writing tips */}
      <WritingTips tips={output.tips} contentType={contentType} />

      {/* Export / actions */}
      <ExportActions
        getPlainText={getPlainText}
        getHTML={getHTML}
        onRegenerate={generate}
        onBack={reset}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
