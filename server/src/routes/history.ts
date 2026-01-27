import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import type { AuthenticatedRequest, HistoryRow } from '../types.js'

const router = Router()

function formatHistory(row: HistoryRow) {
  return {
    id: row.id,
    input: JSON.parse(row.input_json),
    output: JSON.parse(row.output_json),
    workflowName: row.workflow_name,
    createdAt: row.created_at,
  }
}

// GET /api/history
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const rows = await query<HistoryRow>(
    'SELECT * FROM history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user!.userId]
  )

  res.json(rows.map(formatHistory))
})

// POST /api/history
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { input, output, workflowName } = req.body
  if (!input || !output) {
    res.status(400).json({ error: 'input and output are required' })
    return
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute(
    'INSERT INTO history (id, user_id, input_json, output_json, workflow_name, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, req.user!.userId, JSON.stringify(input), JSON.stringify(output), workflowName || null, now]
  )

  const row = (await queryOne<HistoryRow>('SELECT * FROM history WHERE id = $1', [id]))!
  res.status(201).json(formatHistory(row))
})

// DELETE /api/history/:id
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne<HistoryRow>(
    'SELECT * FROM history WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.userId]
  )

  if (!existing) {
    res.status(404).json({ error: 'History item not found' })
    return
  }

  await execute('DELETE FROM history WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// PUT /api/history/:id (update content)
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { content } = req.body
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' })
    return
  }

  const existing = await queryOne<HistoryRow>(
    'SELECT * FROM history WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.userId]
  )

  if (!existing) {
    res.status(404).json({ error: 'History item not found' })
    return
  }

  const output = JSON.parse(existing.output_json)
  output.content = content
  await execute(
    'UPDATE history SET output_json = $1 WHERE id = $2',
    [JSON.stringify(output), req.params.id]
  )

  const row = (await queryOne<HistoryRow>('SELECT * FROM history WHERE id = $1', [req.params.id]))!
  res.json(formatHistory(row))
})

// DELETE /api/history (clear all — admin only)
router.delete('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can clear all history' })
    return
  }

  await execute('DELETE FROM history WHERE user_id = $1', [req.user!.userId])
  res.json({ success: true })
})

export default router
