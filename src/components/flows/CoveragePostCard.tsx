import { Link } from 'react-router-dom'

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
  const statusStyle = statusStyles[post.status] || statusStyles.draft

  return (
    <Link
      to={`/coverage/${post.id}`}
      className="block p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-white flex-1">{post.title}</h4>
        <span
          className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap ml-2 ${statusStyle.bg} ${statusStyle.text}`}
        >
          {post.status}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{post.summary}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        {post.agentName && <span>{post.agentName}</span>}
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  )
}
