import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SocialPost } from '@/types'

interface SocialPostsPanelProps {
  posts: SocialPost[]
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  x: { label: 'X / Twitter', color: '#1da1f2', bgColor: 'rgba(29,161,242,0.1)', icon: '𝕏' },
  facebook: { label: 'Facebook', color: '#1877f2', bgColor: 'rgba(24,119,242,0.1)', icon: 'f' },
  linkedin: { label: 'LinkedIn', color: '#0a66c2', bgColor: 'rgba(10,102,194,0.1)', icon: 'in' },
  instagram: { label: 'Instagram', color: '#e4405f', bgColor: 'rgba(228,64,95,0.1)', icon: 'IG' },
  threads: { label: 'Threads', color: '#ffffff', bgColor: 'rgba(255,255,255,0.08)', icon: '@' },
}

export default function SocialPostsPanel({ posts }: SocialPostsPanelProps) {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null)
  const [editedPosts, setEditedPosts] = useState<Record<string, string>>({})

  const handleCopy = async (platform: string, content: string, hashtags: string[]) => {
    const fullText = hashtags.length > 0
      ? `${content}\n\n${hashtags.map(t => `#${t}`).join(' ')}`
      : content
    try {
      await navigator.clipboard.writeText(fullText)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = fullText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopiedPlatform(platform)
    setTimeout(() => setCopiedPlatform(null), 2000)
  }

  const handleEdit = (platform: string, value: string) => {
    setEditedPosts(prev => ({ ...prev, [platform]: value }))
  }

  if (!posts || posts.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((post) => {
          const config = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.x
          const currentContent = editedPosts[post.platform] ?? post.content
          const charCount = currentContent.length
          const isOverLimit = charCount > post.charLimit
          const isCopied = copiedPlatform === post.platform

          return (
            <div
              key={post.platform}
              className={cn(
                'rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3',
                'hover:border-white/[0.15] transition-all',
              )}
            >
              {/* Platform header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: config.bgColor, color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <span className="text-sm font-medium text-white/80">{config.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(post.platform, currentContent, post.hashtags)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    isCopied
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80',
                  )}
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Post content - editable */}
              <textarea
                value={currentContent}
                onChange={(e) => handleEdit(post.platform, e.target.value)}
                rows={4}
                className={cn(
                  'w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-3',
                  'text-sm text-white/90 leading-relaxed resize-none',
                  'focus:outline-none focus:border-white/20 transition-colors',
                )}
              />

              {/* Hashtags */}
              {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{ backgroundColor: config.bgColor, color: config.color }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Character count */}
              <div className="flex items-center justify-end">
                <span
                  className={cn(
                    'text-xs font-mono',
                    isOverLimit ? 'text-red-400' : 'text-white/30',
                  )}
                >
                  {charCount}/{post.charLimit}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
