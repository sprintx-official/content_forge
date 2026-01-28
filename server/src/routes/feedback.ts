import { Router, type Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { validateBody, validateParams, validateQuery, createFeedbackSchema, idParamSchema } from '../validation/index.js'
import type { AuthenticatedRequest, FeedbackRow } from '../types.js'

const agentIdParamSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID'),
})

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

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
router.get('/', authenticate, validateQuery(paginationQuerySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = typeof req.query.page === 'number' ? req.query.page : 1
  const limit = typeof req.query.limit === 'number' ? req.query.limit : 20
  const offset = (page - 1) * limit

  const rows = await query<FeedbackRow>(
    'SELECT * FROM feedback ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )
  const countResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM feedback')
  const totalCount = parseInt(countResult?.count || '0', 10)

  res.json({
    data: rows.map(formatFeedback),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount,
    },
  })
})

// GET /api/feedback/agent/:agentId
router.get('/agent/:agentId', authenticate, validateParams(agentIdParamSchema), validateQuery(paginationQuerySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = req.params.agentId as string
  const page = typeof req.query.page === 'number' ? req.query.page : 1
  const limit = typeof req.query.limit === 'number' ? req.query.limit : 20
  const offset = (page - 1) * limit

  const rows = await query<FeedbackRow>(
    'SELECT * FROM feedback WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [agentId, limit, offset]
  )
  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM feedback WHERE agent_id = $1',
    [agentId]
  )
  const totalCount = parseInt(countResult?.count || '0', 10)

  res.json({
    data: rows.map(formatFeedback),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount,
    },
  })
})

// POST /api/feedback
router.post('/', authenticate, validateBody(createFeedbackSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId, text, rating } = req.body

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
router.delete('/:id', authenticate, requireAdmin, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne('SELECT id FROM feedback WHERE id = $1', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Feedback not found' })
    return
  }

  await execute('DELETE FROM feedback WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

export default router
