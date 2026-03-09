import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { timeAgo } from '@/lib/timeAgo'

interface CoveragePost {
  id: string
  agentId: string
  title: string
  summary: string
  status: string
  createdAt: string
  agentName?: string
}

interface CoveragePostCardProps {
  post: CoveragePost
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-300' },
  published: { bg: 'bg-green-500/20', text: 'text-green-400' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

export function CoveragePostCard({ post }: CoveragePostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const statusStyle = statusStyles[post.status] || statusStyles.draft

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${post.title}\n\n${post.summary}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-white flex-1">{post.title}</h4>
        <div className="flex items-center gap-2 ml-2">
          <span className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}>
            {post.status}
          </span>
          {expanded ? <ChevronUp className="size-4 text-[#cbd5e1]" /> : <ChevronDown className="size-4 text-[#cbd5e1]" />}
        </div>
      </div>
      <p className={`text-sm text-[#cbd5e1] mb-2 ${expanded ? '' : 'line-clamp-2'}`}>{post.summary}</p>
      <div className="flex items-center justify-between text-xs text-[#cbd5e1]/60">
        <div className="flex items-center gap-3">
          {post.agentName && <span>{post.agentName}</span>}
          <span>{timeAgo(post.createdAt)}</span>
        </div>
        {expanded && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/10 text-[#cbd5e1] transition-colors"
          >
            {copied ? <Check className="size-3 text-[#10b981]" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}
