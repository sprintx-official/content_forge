import { useState, useEffect } from 'react'
import { ArrowLeft, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Loader from '@/components/ui/Loader'
import * as feedbackService from '@/services/feedbackService'
import type { FeedbackItem } from '@/types'

interface AgentFeedbackPanelProps {
  agentId: string
  agentName: string
  onClose: () => void
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'h-4 w-4',
            n <= rating ? 'text-yellow-400' : 'text-[#6b7280]',
          )}
          fill={n <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  )
}

export default function AgentFeedbackPanel({ agentId, agentName, onClose }: AgentFeedbackPanelProps) {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const feedback = await feedbackService.getFeedbackByAgentId(agentId)
        setItems(feedback)
        const avg = await feedbackService.getAverageRatingByAgentId(agentId)
        setAvgRating(avg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [agentId])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback?')) return
    await feedbackService.deleteFeedback(id)
    const feedback = await feedbackService.getFeedbackByAgentId(agentId)
    setItems(feedback)
    const avg = await feedbackService.getAverageRatingByAgentId(agentId)
    setAvgRating(avg)
  }

  if (loading) {
    return <Loader label="Loading feedback..." />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h3 className="text-lg font-semibold text-[#f9fafb]">
          Feedback for {agentName}
        </h3>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3">
        <Badge variant="default">{items.length} review{items.length !== 1 ? 's' : ''}</Badge>
        {items.length > 0 && (
          <Badge variant="purple">
            <Star className="mr-1 h-3 w-3 text-yellow-400" fill="currentColor" />
            {avgRating} avg
          </Badge>
        )}
      </div>

      {/* Feedback list */}
      {items.length === 0 ? (
        <p className="text-center text-[#9ca3af] py-8">No feedback yet.</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {items
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#f9fafb]">
                      {item.userName}
                    </span>
                    <Badge variant="outline">{item.userId === 'anonymous' ? 'guest' : 'user'}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarDisplay rating={item.rating} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-[#9ca3af] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-[#d1d5db]">{item.text}</p>
                <p className="text-xs text-[#6b7280]">
                  {new Date(item.createdAt).toLocaleDateString()} &middot;{' '}
                  {new Date(item.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
