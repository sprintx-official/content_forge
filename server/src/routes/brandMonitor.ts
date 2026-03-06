import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { runBrandQueries } from '../services/brandMonitor.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/brand-monitor/queries — List all brand queries
// ---------------------------------------------------------------------------
router.get('/queries', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId } = req.query
  let sql = 'SELECT * FROM brand_queries'
  const params: unknown[] = []

  if (agentId && typeof agentId === 'string') {
    params.push(agentId)
    sql += ` WHERE agent_id = $${params.length}`
  }
  sql += ' ORDER BY created_at DESC'

  const queries = await query<Record<string, unknown>>(sql, params)
  res.json({ queries })
})

// ---------------------------------------------------------------------------
// POST /api/brand-monitor/queries — Create a brand query
// ---------------------------------------------------------------------------
router.post('/queries', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId, queryText, frequency } = req.body as {
    agentId?: string
    queryText: string
    frequency?: 'daily' | 'weekly'
  }

  if (!queryText) {
    res.status(400).json({ error: 'queryText is required' })
    return
  }

  const id = crypto.randomUUID()
  await execute(
    `INSERT INTO brand_queries (id, agent_id, query, frequency, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [id, agentId || null, queryText, frequency || 'daily'],
  )

  res.status(201).json({ id })
})

// ---------------------------------------------------------------------------
// DELETE /api/brand-monitor/queries/:id — Delete a brand query
// ---------------------------------------------------------------------------
router.delete('/queries/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  await execute('DELETE FROM brand_queries WHERE id = $1', [id])
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// PATCH /api/brand-monitor/queries/:id — Toggle active/inactive
// ---------------------------------------------------------------------------
router.patch('/queries/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { isActive } = req.body as { isActive: boolean }

  await execute(
    'UPDATE brand_queries SET is_active = $1 WHERE id = $2',
    [isActive ? 1 : 0, id],
  )
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/brand-monitor/run — Trigger a manual brand monitoring run
// ---------------------------------------------------------------------------
router.post('/run', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await runBrandQueries()
    res.json({ success: true, message: 'Brand monitoring run completed' })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Brand monitoring run failed' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/brand-monitor/results — List brand results
// ---------------------------------------------------------------------------
router.get('/results', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { queryId, limit: limitParam } = req.query
  const limit = Math.min(parseInt(String(limitParam) || '50', 10), 200)

  let sql = `SELECT br.*, bq.query as query_text
    FROM brand_results br
    JOIN brand_queries bq ON bq.id = br.query_id`
  const params: unknown[] = []

  if (queryId && typeof queryId === 'string') {
    params.push(queryId)
    sql += ` WHERE br.query_id = $${params.length}`
  }

  params.push(limit)
  sql += ` ORDER BY br.created_at DESC LIMIT $${params.length}`

  const results = await query<Record<string, unknown>>(sql, params)
  res.json({ results })
})

// ---------------------------------------------------------------------------
// GET /api/brand-monitor/results/:queryId/summary — Summary for a query
// ---------------------------------------------------------------------------
router.get('/results/:queryId/summary', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const queryId = String(req.params.queryId)

  const results = await query<{ provider: string; sentiment: string; response: string; entities: string; created_at: string }>(
    `SELECT provider, sentiment, response, entities, created_at
     FROM brand_results
     WHERE query_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [queryId],
  )

  // Aggregate sentiment
  const sentimentCounts: Record<string, number> = {}
  const allEntities = new Set<string>()

  for (const r of results) {
    sentimentCounts[r.sentiment] = (sentimentCounts[r.sentiment] || 0) + 1
    try {
      const entities = JSON.parse(r.entities) as string[]
      for (const e of entities) allEntities.add(e)
    } catch { /* skip */ }
  }

  res.json({
    queryId,
    totalResults: results.length,
    sentimentCounts,
    entities: [...allEntities],
    latestResults: results.slice(0, 10),
  })
})

export default router
