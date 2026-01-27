import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, FeedbackRow } from '../types.js'

const router = Router()

function formatFeedback(row: FeedbackRow) {
  return {
    id: row.id,
    agentId: row.agent_id,
    userId: row.user_id,
    userName: row.user_name,
    text: row.text,
    rating: row.rating,
    createdAt: row.created_at,
  }
}

// GET /api/feedback
router.get('/', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const rows = await query<FeedbackRow>('SELECT * FROM feedback ORDER BY created_at DESC')
  res.json(rows.map(formatFeedback))
})

// GET /api/feedback/agent/:agentId
router.get('/agent/:agentId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const rows = await query<FeedbackRow>(
    'SELECT * FROM feedback WHERE agent_id = $1 ORDER BY created_at DESC',
    [req.params.agentId]
  )
  res.json(rows.map(formatFeedback))
})

// POST /api/feedback
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId, text, rating } = req.body
  if (!agentId || !text || !rating) {
    res.status(400).json({ error: 'agentId, text, and rating are required' })
    return
  }

  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5' })
    return
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const userId = req.user?.userId || 'anonymous'

  // Get user name
  const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [userId])
  const userName = user?.name || 'Anonymous'

  await execute(
    'INSERT INTO feedback (id, agent_id, user_id, user_name, text, rating, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, agentId, userId, userName, text.trim(), rating, now]
  )

  const row = (await queryOne<FeedbackRow>('SELECT * FROM feedback WHERE id = $1', [id]))!
  res.status(201).json(formatFeedback(row))
})

// DELETE /api/feedback/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne('SELECT id FROM feedback WHERE id = $1', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Feedback not found' })
    return
  }

  await execute('DELETE FROM feedback WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

export default router
