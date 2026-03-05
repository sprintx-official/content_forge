import { useCallback, useRef, useState } from 'react'
import { Sparkles, FileText, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import { Badge } from '@/components/ui/badge'
import ContentDisplay from '@/components/output/ContentDisplay'
import FileTabBar from '@/components/output/FileTabBar'
import MetricsCards from '@/components/output/MetricsCards'
import WritingTips from '@/components/output/WritingTips'
import AgentPipelinePreview from '@/components/output/AgentPipelinePreview'
import ExportActions from '@/components/output/ExportActions'
import RefinePanel from '@/components/output/RefinePanel'
import DiffView from '@/components/output/DiffView'
import MiniChatPanel from '@/components/output/MiniChatPanel'
import SocialPostsPanel from '@/components/output/SocialPostsPanel'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'
import type { Editor } from '@tiptap/react'

export default function OutputPanel() {
  const output = useForgeStore((s) => s.output)
  const input = useForgeStore((s) => s.input)
  const generate = useForgeStore((s) => s.generate)
  const reset = useForgeStore((s) => s.reset)

  // Multi-file state
  const parsedFiles = useForgeStore((s) => s.parsedFiles)
  const activeFileIndex = useForgeStore((s) => s.activeFileIndex)
  const setActiveFileIndex = useForgeStore((s) => s.setActiveFileIndex)

  // Fullscreen state
  const isFullscreen = useForgeStore((s) => s.isFullscreen)
  const toggleFullscreen = useForgeStore((s) => s.toggleFullscreen)

  // Refine state
  const refineState = useForgeStore((s) => s.refineState)
  const startRefine = useForgeStore((s) => s.startRefine)
  const cancelRefine = useForgeStore((s) => s.cancelRefine)
  const setRefineTone = useForgeStore((s) => s.setRefineTone)
  const setRefineAudience = useForgeStore((s) => s.setRefineAudience)
  const executeRefine = useForgeStore((s) => s.executeRefine)
  const applyRefinement = useForgeStore((s) => s.applyRefinement)
  const rejectRefinement = useForgeStore((s) => s.rejectRefinement)

  const [outputTab, setOutputTab] = useState<'article' | 'social'>('article')
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

  // Resolve display names for badges (hooks must be called before any early return)
  const tones = useForgeOptionsStore((s) => s.tones)
  const audiences = useForgeOptionsStore((s) => s.audiences)

  if (!output) return null

  const toneName = tones.find((t) => t.id === input.tone)?.name ?? input.tone
  const audienceName = audiences.find((a) => a.id === input.audience)?.name ?? input.audience

  // Active file for the editor
  const activeFile = parsedFiles[activeFileIndex] ?? null
  const activeContent = activeFile?.content ?? output.content
  const isCodeMode = activeFile?.extension === 'json'

  // Word count target props
  const targetWordCount =
    input.length === 'custom' && input.customWordCount ? input.customWordCount : undefined
  const tolerancePercent = input.tolerancePercent ?? 15

  return (
    <div className="space-y-6 animate-[fadeIn_0.6s_ease-out_both]">
      {/* Title + settings badges */}
      <div>
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

        {/* Settings badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3 ml-9">
          <Badge variant="purple">{toneName}</Badge>
          <Badge variant="pink">{audienceName}</Badge>
          {targetWordCount && (
            <Badge variant="green">{targetWordCount.toLocaleString()} words target</Badge>
          )}
          {output.tokenUsage?.model && (
            <Badge variant="outline">{output.tokenUsage.model}</Badge>
          )}
        </div>
      </div>

      {/* Output sub-tabs */}
      {output.socialPosts && output.socialPosts.length > 0 && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] w-fit">
          <button
            type="button"
            onClick={() => setOutputTab('article')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              outputTab === 'article'
                ? 'bg-gradient-to-r from-[#00f0ff]/15 to-[#a855f7]/15 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]',
            )}
          >
            <FileText className={cn('w-4 h-4', outputTab === 'article' ? 'text-[#00f0ff]' : 'text-white/30')} />
            Article
          </button>
          <button
            type="button"
            onClick={() => setOutputTab('social')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              outputTab === 'social'
                ? 'bg-gradient-to-r from-[#00f0ff]/15 to-[#a855f7]/15 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]',
            )}
          >
            <Share2 className={cn('w-4 h-4', outputTab === 'social' ? 'text-[#00f0ff]' : 'text-white/30')} />
            Social Posts
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#a855f7]/20 text-[#a855f7]">
              {output.socialPosts.length}
            </span>
          </button>
        </div>
      )}

      {/* Article tab content */}
      {outputTab === 'article' && (
        <>
          {/* Refine panel (shown when refine is active but not yet showing diff) */}
          {refineState && !refineState.isShowingDiff && (
            <RefinePanel
              currentTone={input.tone}
              currentAudience={input.audience}
              refineTone={refineState.refineTone}
              refineAudience={refineState.refineAudience}
              isRefining={refineState.isRefining}
              onToneChange={setRefineTone}
              onAudienceChange={setRefineAudience}
              onApply={executeRefine}
              onCancel={cancelRefine}
            />
          )}

          {/* Diff view (shown after refinement completes) */}
          {refineState?.isShowingDiff ? (
            <DiffView
              original={refineState.originalContent}
              refined={refineState.refinedContent}
              onAccept={applyRefinement}
              onReject={rejectRefinement}
            />
          ) : (
            <>
              {/* File tab bar (multi-file) */}
              <FileTabBar
                files={parsedFiles}
                activeIndex={activeFileIndex}
                onTabChange={setActiveFileIndex}
              />

              {/* Generated content */}
              <ContentDisplay
                content={activeContent}
                onEditorReady={handleEditorReady}
                isCodeMode={isCodeMode}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            </>
          )}

          {/* Metrics */}
          <MetricsCards
            metrics={output.metrics}
            tokenUsage={output.tokenUsage}
            targetWordCount={targetWordCount}
            tolerancePercent={tolerancePercent}
          />

          {/* Writing tips */}
          <WritingTips tips={output.tips} contentType={input.contentType} />

          {/* Agent pipeline preview */}
          {output.agentPipeline && output.agentPipeline.length > 0 && (
            <AgentPipelinePreview pipeline={output.agentPipeline} />
          )}

          {/* Mini chat panel */}
          <MiniChatPanel contentContext={activeContent} />
        </>
      )}

      {/* Social posts tab content */}
      {outputTab === 'social' && output.socialPosts && (
        <SocialPostsPanel posts={output.socialPosts} />
      )}

      {/* Export / actions */}
      <ExportActions
        getPlainText={getPlainText}
        getHTML={getHTML}
        onRegenerate={generate}
        onBack={reset}
        activeFile={activeFile}
        onRefine={outputTab === 'article' ? startRefine : undefined}
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
