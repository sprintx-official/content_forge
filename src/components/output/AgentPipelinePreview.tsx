import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Bot, FileText, MessageSquare, Brain, BookOpen, Terminal, ArrowDownToLine, ArrowUpFromLine, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentPipelineStep } from '@/types'

interface AgentPipelinePreviewProps {
  pipeline: AgentPipelineStep[]
}

function SubSection({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight)
  }, [children])

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors cursor-pointer"
      >
        <Icon className="w-3.5 h-3.5 text-[#6366f1]" />
        <span className="text-[#cbd5e1] font-medium">{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#94a3b8] ml-auto transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-400 ease-in-out"
        style={{ maxHeight: open ? `${height}px` : '0px' }}
      >
        <div ref={ref} className="px-3 pb-3 pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AgentPipelinePreview({ pipeline }: AgentPipelinePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) setContentHeight(contentRef.current.scrollHeight)
  }, [pipeline, isOpen])

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'w-full flex items-center justify-between p-5 cursor-pointer',
          'text-left transition-colors hover:bg-white/5',
        )}
      >
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-[#6366f1]" />
          <span className="text-[#f8fafc] font-semibold text-lg">Agent Pipeline</span>
          <span className="text-xs text-[#94a3b8] bg-white/5 rounded-full px-2.5 py-0.5">
            {pipeline.length} {pipeline.length === 1 ? 'agent' : 'agents'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-[#94a3b8] transition-transform duration-300',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: isOpen ? `${contentHeight}px` : '0px' }}
      >
        <div ref={contentRef} className="px-5 pb-5">
          {pipeline.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index > 0 && (
                <div className="flex justify-center py-2">
                  <div className="w-px h-6 bg-gradient-to-b from-[#6366f1]/40 to-[#10b981]/40" />
                </div>
              )}

              {/* Agent card */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                {/* Agent header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20">
                    <span className="text-base leading-none">{step.agentIcon || '🤖'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#6366f1] bg-[#6366f1]/10 rounded px-1.5 py-0.5">
                        Step {index + 1}
                      </span>
                      <h4 className="font-semibold text-[#f8fafc] truncate">{step.agentName}</h4>
                    </div>
                    {step.agentDescription && (
                      <p className="text-xs text-[#94a3b8] mt-0.5 truncate">{step.agentDescription}</p>
                    )}
                  </div>
                </div>

                {/* Token Usage & Cost */}
                {step.tokenUsage && (
                  <div className="flex items-center gap-4 mb-3 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-[#cbd5e1]">
                        Model: <span className="text-[#f8fafc] font-medium">{step.tokenUsage.model}</span>
                      </span>
                      <span className="text-[#cbd5e1]">
                        Input: <span className="text-[#10b981]">{step.tokenUsage.inputTokens.toLocaleString()}</span>
                      </span>
                      {step.tokenUsage.cachedInputTokens > 0 && (
                        <span className="text-[#cbd5e1]">
                          Cached: <span className="text-emerald-400">{step.tokenUsage.cachedInputTokens.toLocaleString()}</span>
                        </span>
                      )}
                      <span className="text-[#cbd5e1]">
                        Output: <span className="text-[#6366f1]">{step.tokenUsage.outputTokens.toLocaleString()}</span>
                      </span>
                      <span className="text-[#cbd5e1]">
                        Total: <span className="text-[#f8fafc]">{step.tokenUsage.totalTokens.toLocaleString()}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        ${step.tokenUsage.costUsd.toFixed(6)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Sub-sections */}
                <div className="space-y-2">
                  {step.systemPrompt && (
                    <SubSection label="System Prompt" icon={Terminal}>
                      <pre className="text-xs text-[#cbd5e1] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                        {step.systemPrompt}
                      </pre>
                    </SubSection>
                  )}

                  {step.instructions && (
                    <SubSection label="Instructions" icon={BookOpen}>
                      <p className="text-xs text-[#cbd5e1] whitespace-pre-wrap leading-relaxed">
                        {step.instructions}
                      </p>
                    </SubSection>
                  )}

                  {step.knowledgeBase && (
                    <SubSection label="Knowledge Base" icon={Brain}>
                      <pre className="text-xs text-[#cbd5e1] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                        {step.knowledgeBase}
                      </pre>
                    </SubSection>
                  )}

                  {step.files.length > 0 && (
                    <SubSection label={`Files (${step.files.length})`} icon={FileText}>
                      <ul className="space-y-1">
                        {step.files.map((file, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                            <FileText className="w-3 h-3 text-[#94a3b8]" />
                            {file}
                          </li>
                        ))}
                      </ul>
                    </SubSection>
                  )}

                  {step.feedback && (
                    <SubSection label={`Feedback (avg ${step.feedback.avgRating}/5)`} icon={MessageSquare}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                          <span>Average Rating:</span>
                          <span className="font-semibold text-[#10b981]">{step.feedback.avgRating}/5</span>
                        </div>
                        {step.feedback.recentTexts.length > 0 && (
                          <div className="space-y-1">
                            {step.feedback.recentTexts.map((text, i) => (
                              <p key={i} className="text-xs text-[#94a3b8] italic pl-2 border-l-2 border-[#6366f1]/30">
                                {text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </SubSection>
                  )}

                  {step.memories && step.memories.length > 0 && (
                    <SubSection label={`Memory (${step.memories.length})`} icon={Brain}>
                      <div className="space-y-2">
                        {step.memories.map((mem, i) => (
                          <div key={i} className="text-xs text-[#cbd5e1]">
                            <span className="font-medium text-[#10b981]">{mem.topic}</span>
                            <span className="text-[#94a3b8]"> — </span>
                            <span>{mem.summary}</span>
                          </div>
                        ))}
                      </div>
                    </SubSection>
                  )}

                  {/* Input Section */}
                  {step.input && (
                    <SubSection label="Input" icon={ArrowDownToLine}>
                      <pre className="text-xs text-[#cbd5e1] whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto bg-black/20 rounded-lg p-3 border border-[#10b981]/20">
                        {step.input}
                      </pre>
                    </SubSection>
                  )}

                  {/* Output Section */}
                  {step.output && (
                    <SubSection label="Output" icon={ArrowUpFromLine}>
                      <pre className="text-xs text-[#cbd5e1] whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto bg-black/20 rounded-lg p-3 border border-[#6366f1]/20">
                        {step.output}
                      </pre>
                    </SubSection>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Overall Summary */}
          {pipeline.some(step => step.tokenUsage) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="bg-gradient-to-r from-emerald-500/10 to-[#10b981]/10 rounded-xl border border-emerald-500/20 p-4">
                <h4 className="text-sm font-semibold text-[#f8fafc] mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Pipeline Total
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-[#cbd5e1] mb-1">Input Tokens</div>
                    <div className="text-lg font-bold text-[#10b981]">
                      {pipeline.reduce((sum, s) => sum + (s.tokenUsage?.inputTokens ?? 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[#cbd5e1] mb-1">Cached Tokens</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {pipeline.reduce((sum, s) => sum + (s.tokenUsage?.cachedInputTokens ?? 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[#cbd5e1] mb-1">Output Tokens</div>
                    <div className="text-lg font-bold text-[#6366f1]">
                      {pipeline.reduce((sum, s) => sum + (s.tokenUsage?.outputTokens ?? 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[#cbd5e1] mb-1">Total Tokens</div>
                    <div className="text-lg font-bold text-[#f8fafc]">
                      {pipeline.reduce((sum, s) => sum + (s.tokenUsage?.totalTokens ?? 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[#cbd5e1] mb-1">Total Cost</div>
                    <div className="text-lg font-bold text-emerald-400">
                      ${pipeline.reduce((sum, s) => sum + (s.tokenUsage?.costUsd ?? 0), 0).toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
