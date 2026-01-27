import { Router, type Response } from 'express'
import { query, queryOne, execute } from '../database/connection.js'
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
router.get('/agent/:agentId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100)
  const rows = await query<AgentMemoryRow>(
    'SELECT * FROM agent_memory WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.params.agentId, limit]
  )
  res.json(rows.map(formatMemory))
})

// DELETE /api/memory/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne('SELECT id FROM agent_memory WHERE id = $1', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Memory entry not found' })
    return
  }
  await execute('DELETE FROM agent_memory WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// DELETE /api/memory/agent/:agentId
router.delete('/agent/:agentId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await execute('DELETE FROM agent_memory WHERE agent_id = $1', [req.params.agentId])
  res.json({ success: true })
})

export default router
