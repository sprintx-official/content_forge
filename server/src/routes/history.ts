import { Router, type Response } from 'express'
import crypto from 'crypto'
import { getDb } from '../database/connection.js'
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
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const rows = db.prepare(
    'SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user!.userId) as HistoryRow[]

  res.json(rows.map(formatHistory))
})

// POST /api/history
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { input, output, workflowName } = req.body
  if (!input || !output) {
    res.status(400).json({ error: 'input and output are required' })
    return
  }

  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO history (id, user_id, input_json, output_json, workflow_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user!.userId, JSON.stringify(input), JSON.stringify(output), workflowName || null, now)

  const row = db.prepare('SELECT * FROM history WHERE id = ?').get(id) as HistoryRow
  res.status(201).json(formatHistory(row))
})

// DELETE /api/history/:id
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM history WHERE id = ? AND user_id = ?').get(
    req.params.id, req.user!.userId
  ) as HistoryRow | undefined

  if (!existing) {
    res.status(404).json({ error: 'History item not found' })
    return
  }

  db.prepare('DELETE FROM history WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// PUT /api/history/:id (update content)
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { content } = req.body
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' })
    return
  }

  const db = getDb()
  const existing = db.prepare('SELECT * FROM history WHERE id = ? AND user_id = ?').get(
    req.params.id, req.user!.userId
  ) as HistoryRow | undefined

  if (!existing) {
    res.status(404).json({ error: 'History item not found' })
    return
  }

  const output = JSON.parse(existing.output_json)
  output.content = content
  db.prepare('UPDATE history SET output_json = ? WHERE id = ?').run(JSON.stringify(output), req.params.id)

  const row = db.prepare('SELECT * FROM history WHERE id = ?').get(req.params.id) as HistoryRow
  res.json(formatHistory(row))
})

// DELETE /api/history (clear all — admin only)
router.delete('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can clear all history' })
    return
  }

  const db = getDb()
  db.prepare('DELETE FROM history WHERE user_id = ?').run(req.user!.userId)
  res.json({ success: true })
})

export default router
