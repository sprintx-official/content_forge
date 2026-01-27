import { useState, useEffect } from 'react'
import { MessageSquarePlus, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeedbackStore } from '@/stores/useFeedbackStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAdminStore } from '@/stores/useAdminStore'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function FeedbackButton() {
  const { openModal } = useFeedbackStore()

  return (
    <button
      onClick={openModal}
      className={cn(
        'fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3',
        'bg-[#a855f7] text-white font-semibold shadow-[0_0_20px_rgba(168,85,247,0.4)]',
        'hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:bg-[#b96ef8] active:bg-[#9333ea]',
        'transition-all duration-200 cursor-pointer',
      )}
    >
      <MessageSquarePlus className="h-5 w-5" />
      Feedback
    </button>
  )
}

export function FeedbackModal() {
  const { isModalOpen, closeModal, submitFeedback } = useFeedbackStore()
  const { user } = useAuthStore()
  const { agents, loadAgents } = useAdminStore()

  const [agentId, setAgentId] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isModalOpen) {
      loadAgents()
      setAgentId('')
      setRating(0)
      setHoverRating(0)
      setText('')
      setError('')
      setSuccess(false)
    }
  }, [isModalOpen, loadAgents])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => closeModal(), 1500)
      return () => clearTimeout(timer)
    }
  }, [success, closeModal])

  if (!isModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agentId) {
      setError('Please select an agent.')
      return
    }
    if (rating === 0) {
      setError('Please select a rating.')
      return
    }
    if (!text.trim()) {
      setError('Please write your feedback.')
      return
    }

    setSubmitting(true)
    try {
      await submitFeedback({
        agentId,
        userId: user?.id ?? 'anonymous',
        userName: user?.name ?? 'Anonymous',
        text: text.trim(),
        rating,
      })
      setSuccess(true)
    } catch {
      setError('Failed to submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0e1a] p-6 shadow-2xl">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#34d399]/15">
              <Star className="h-6 w-6 text-[#34d399]" fill="#34d399" />
            </div>
            <p className="text-lg font-semibold text-[#f9fafb]">Thank you!</p>
            <p className="text-sm text-[#9ca3af]">Your feedback has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#f9fafb]">Agent Feedback</h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Select
              label="Agent"
              options={agentOptions}
              placeholder="Select an agent..."
              value={agentId}
              onChange={setAgentId}
            />

            {/* Star Rating */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#9ca3af]">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={cn(
                        'h-7 w-7 transition-colors',
                        (hoverRating || rating) >= n
                          ? 'text-yellow-400'
                          : 'text-[#6b7280]',
                      )}
                      fill={(hoverRating || rating) >= n ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Feedback"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience with this agent..."
              rows={4}
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" variant="secondary" size="md" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={closeModal}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
