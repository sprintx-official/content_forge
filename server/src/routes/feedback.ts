import { Router, type Response } from 'express'
import crypto from 'crypto'
import { getDb } from '../database/connection.js'
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
router.get('/', authenticate, (_req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all() as FeedbackRow[]
  res.json(rows.map(formatFeedback))
})

// GET /api/feedback/agent/:agentId
router.get('/agent/:agentId', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM feedback WHERE agent_id = ? ORDER BY created_at DESC').all(req.params.agentId) as FeedbackRow[]
  res.json(rows.map(formatFeedback))
})

// POST /api/feedback
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { agentId, text, rating } = req.body
  if (!agentId || !text || !rating) {
    res.status(400).json({ error: 'agentId, text, and rating are required' })
    return
  }

  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5' })
    return
  }

  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const userId = req.user?.userId || 'anonymous'

  // Get user name
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined
  const userName = user?.name || 'Anonymous'

  db.prepare(
    'INSERT INTO feedback (id, agent_id, user_id, user_name, text, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, agentId, userId, userName, text.trim(), rating, now)

  const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as FeedbackRow
  res.status(201).json(formatFeedback(row))
})

// DELETE /api/feedback/:id
router.delete('/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM feedback WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Feedback not found' })
    return
  }

  db.prepare('DELETE FROM feedback WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
