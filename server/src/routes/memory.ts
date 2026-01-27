import { Router, type Response } from 'express'
import { getDb } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, AgentMemoryRow } from '../types.js'

const router = Router()

function formatMemory(row: AgentMemoryRow) {
  return {
    id: row.id,
    agentId: row.agent_id,
    topic: row.topic,
    summary: row.summary,
    outputText: row.output_text,
    historyId: row.history_id,
    createdAt: row.created_at,
  }
}

// GET /api/memory/agent/:agentId
router.get('/agent/:agentId', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100)
  const rows = db.prepare(
    'SELECT * FROM agent_memory WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(req.params.agentId, limit) as AgentMemoryRow[]
  res.json(rows.map(formatMemory))
})

// DELETE /api/memory/:id
router.delete('/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM agent_memory WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Memory entry not found' })
    return
  }
  db.prepare('DELETE FROM agent_memory WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// DELETE /api/memory/agent/:agentId
router.delete('/agent/:agentId', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  db.prepare('DELETE FROM agent_memory WHERE agent_id = ?').run(req.params.agentId)
  res.json({ success: true })
})

export default router
