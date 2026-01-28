import { Router, type Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody, validateParams, validateQuery, idParamSchema } from '../validation/index.js'
import type { AuthenticatedRequest, HistoryRowWithUser } from '../types.js'

const historyPostSchema = z.object({
  input: z.object({}).passthrough(),
  output: z.object({}).passthrough(),
  workflowName: z.string().optional(),
})

const historyUpdateSchema = z.object({
  content: z.string().min(1, 'Content is required'),
})

const searchQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const router = Router()

function formatHistory(row: HistoryRowWithUser) {
  return {
    id: row.id,
    input: JSON.parse(row.input_json),
    output: JSON.parse(row.output_json),
    workflowName: row.workflow_name,
    userName: row.user_name,
    createdAt: row.created_at,
  }
}

// GET /api/history
router.get('/', authenticate, validateQuery(searchQuerySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isAdmin = req.user!.role === 'admin'
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const page = typeof req.query.page === 'number' ? req.query.page : 1
  const limit = typeof req.query.limit === 'number' ? req.query.limit : 20
  const offset = (page - 1) * limit

  let rows: HistoryRowWithUser[]
  let totalCount: number

  if (isAdmin) {
    if (search) {
      rows = await query<HistoryRowWithUser>(
        'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE u.name ILIKE $1 ORDER BY h.created_at DESC LIMIT $2 OFFSET $3',
        [`%${search}%`, limit, offset]
      )
      const countResult = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE u.name ILIKE $1',
        [`%${search}%`]
      )
      totalCount = parseInt(countResult?.count || '0', 10)
    } else {
      rows = await query<HistoryRowWithUser>(
        'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id ORDER BY h.created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      )
      const countResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM history')
      totalCount = parseInt(countResult?.count || '0', 10)
    }
  } else {
    rows = await query<HistoryRowWithUser>(
      'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE h.user_id = $1 ORDER BY h.created_at DESC LIMIT $2 OFFSET $3',
      [req.user!.userId, limit, offset]
    )
    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM history WHERE user_id = $1',
      [req.user!.userId]
    )
    totalCount = parseInt(countResult?.count || '0', 10)
  }

  res.json({
    data: rows.map(formatHistory),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount,
    },
  })
})

// POST /api/history
router.post('/', authenticate, validateBody(historyPostSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { input, output, workflowName } = req.body

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute(
    'INSERT INTO history (id, user_id, input_json, output_json, workflow_name, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, req.user!.userId, JSON.stringify(input), JSON.stringify(output), workflowName || null, now]
  )

  const row = (await queryOne<HistoryRowWithUser>(
    'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE h.id = $1',
    [id]
  ))!
  res.status(201).json(formatHistory(row))
})

// DELETE /api/history/:id
router.delete('/:id', authenticate, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isAdmin = req.user!.role === 'admin'
  const id = req.params.id as string

  // Admins can delete any history item, users can only delete their own
  let existing: HistoryRowWithUser | undefined
  if (isAdmin) {
    existing = await queryOne<HistoryRowWithUser>(
      'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE h.id = $1',
      [id]
    )
  } else {
    existing = await queryOne<HistoryRowWithUser>(
      'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE h.id = $1 AND h.user_id = $2',
      [id, req.user!.userId]
    )
  }

  if (!existing) {
    res.status(404).json({ error: 'History item not found' })
    return
  }

  await execute('DELETE FROM history WHERE id = $1', [id])
  res.json({ success: true })
})

// PUT /api/history/:id (update content)
router.put('/:id', authenticate, validateParams(idParamSchema), validateBody(historyUpdateSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { content } = req.body
  const isAdmin = req.user!.role === 'admin'
  const id = req.params.id as string

  // Admins can edit any history item, users can only edit their own
  let existing: HistoryRowWithUser | undefined
  if (isAdmin) {
    existing = await queryOne<HistoryRowWithUser>(
      'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE h.id = $1',
      [id]
    )
  } else {
    existing = await queryOne<HistoryRowWithUser>(
      'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE h.id = $1 AND h.user_id = $2',
      [id, req.user!.userId]
    )
  }

  if (!existing) {
    res.status(404).json({ error: 'History item not found' })
    return
  }

  const outputData = JSON.parse(existing.output_json)
  outputData.content = content
  await execute(
    'UPDATE history SET output_json = $1 WHERE id = $2',
    [JSON.stringify(outputData), id]
  )

  const row = (await queryOne<HistoryRowWithUser>(
    'SELECT h.*, u.name AS user_name FROM history h LEFT JOIN users u ON h.user_id = u.id WHERE h.id = $1',
    [id]
  ))!
  res.json(formatHistory(row))
})

// DELETE /api/history (clear all — admin only)
router.delete('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can clear all history' })
    return
  }

  await execute('DELETE FROM history')
  res.json({ success: true })
})

export default router
