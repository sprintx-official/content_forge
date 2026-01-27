import { useState, useRef, useEffect } from 'react'
import { Lightbulb, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WritingTip, ContentType } from '@/types'

interface WritingTipsProps {
  tips: WritingTip[]
  contentType: ContentType
}

export default function WritingTips({ tips, contentType }: WritingTipsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  const displayedTips = tips.slice(0, 5)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [displayedTips])

  const contentTypeLabel: Record<ContentType, string> = {
    article: 'Article',
    blog: 'Blog Post',
    social: 'Social Media',
    press: 'Press Release',
    script: 'Script',
    'ad-copy': 'Ad Copy',
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between p-5 cursor-pointer',
          'text-left transition-colors hover:bg-white/5',
        )}
      >
        <div className="flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-[#00f0ff]" />
          <span className="text-[#f9fafb] font-semibold text-lg">
            Writing Tips
          </span>
          <span className="text-xs text-[#6b7280] bg-white/5 rounded-full px-2.5 py-0.5">
            {contentTypeLabel[contentType]}
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
          {displayedTips.map((tip, index) => (
            <div
              key={index}
              className={cn(
                'bg-white/5 rounded-lg p-4',
                index < displayedTips.length - 1 && 'mb-3',
              )}
            >
              <h4 className="font-medium text-[#00f0ff] mb-1">{tip.title}</h4>
              <p className="text-sm text-[#9ca3af] leading-relaxed">
                {tip.description}
              </p>
              {tip.example && (
                <p className="mt-2 pl-3 border-l-2 border-[#00f0ff]/30 italic text-sm text-[#6b7280] leading-relaxed">
                  {tip.example}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
