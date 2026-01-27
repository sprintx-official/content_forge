import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Bot, FileText, MessageSquare, Brain, BookOpen, Terminal } from 'lucide-react'
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
        <Icon className="w-3.5 h-3.5 text-[#a855f7]" />
        <span className="text-[#9ca3af] font-medium">{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#6b7280] ml-auto transition-transform duration-300', open && 'rotate-180')} />
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
          <Bot className="w-5 h-5 text-[#a855f7]" />
          <span className="text-[#f9fafb] font-semibold text-lg">Agent Pipeline</span>
          <span className="text-xs text-[#6b7280] bg-white/5 rounded-full px-2.5 py-0.5">
            {pipeline.length} {pipeline.length === 1 ? 'agent' : 'agents'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-[#6b7280] transition-transform duration-300',
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
                  <div className="w-px h-6 bg-gradient-to-b from-[#a855f7]/40 to-[#00f0ff]/40" />
                </div>
              )}

              {/* Agent card */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                {/* Agent header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/20">
                    <span className="text-base leading-none">{step.agentIcon || '🤖'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#a855f7] bg-[#a855f7]/10 rounded px-1.5 py-0.5">
                        Step {index + 1}
                      </span>
                      <h4 className="font-semibold text-[#f9fafb] truncate">{step.agentName}</h4>
                    </div>
                    {step.agentDescription && (
                      <p className="text-xs text-[#6b7280] mt-0.5 truncate">{step.agentDescription}</p>
                    )}
                  </div>
                </div>

                {/* Sub-sections */}
                <div className="space-y-2">
                  {step.systemPrompt && (
                    <SubSection label="System Prompt" icon={Terminal}>
                      <pre className="text-xs text-[#9ca3af] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                        {step.systemPrompt}
                      </pre>
                    </SubSection>
                  )}

                  {step.instructions && (
                    <SubSection label="Instructions" icon={BookOpen}>
                      <p className="text-xs text-[#9ca3af] whitespace-pre-wrap leading-relaxed">
                        {step.instructions}
                      </p>
                    </SubSection>
                  )}

                  {step.knowledgeBase && (
                    <SubSection label="Knowledge Base" icon={Brain}>
                      <pre className="text-xs text-[#9ca3af] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                        {step.knowledgeBase}
                      </pre>
                    </SubSection>
                  )}

                  {step.files.length > 0 && (
                    <SubSection label={`Files (${step.files.length})`} icon={FileText}>
                      <ul className="space-y-1">
                        {step.files.map((file, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-[#9ca3af]">
                            <FileText className="w-3 h-3 text-[#6b7280]" />
                            {file}
                          </li>
                        ))}
                      </ul>
                    </SubSection>
                  )}

                  {step.feedback && (
                    <SubSection label={`Feedback (avg ${step.feedback.avgRating}/5)`} icon={MessageSquare}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                          <span>Average Rating:</span>
                          <span className="font-semibold text-[#00f0ff]">{step.feedback.avgRating}/5</span>
                        </div>
                        {step.feedback.recentTexts.length > 0 && (
                          <div className="space-y-1">
                            {step.feedback.recentTexts.map((text, i) => (
                              <p key={i} className="text-xs text-[#6b7280] italic pl-2 border-l-2 border-[#a855f7]/30">
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
                          <div key={i} className="text-xs text-[#9ca3af]">
                            <span className="font-medium text-[#00f0ff]">{mem.topic}</span>
                            <span className="text-[#6b7280]"> — </span>
                            <span>{mem.summary}</span>
                          </div>
                        ))}
                      </div>
                    </SubSection>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
