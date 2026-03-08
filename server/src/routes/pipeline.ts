import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/pipeline/settings/:agentId — Get pipeline settings
// ---------------------------------------------------------------------------
router.get('/settings/:agentId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const keys = [
    'pipeline_enabled', 'pipeline_interval',
    'model_filter', 'model_cluster', 'model_dedup',
    'model_research', 'model_generate', 'model_image_generate',
  ]
  const settings: Record<string, string | null> = {}
  for (const key of keys) {
    const row = await queryOne<{ value: string }>(
      'SELECT value FROM agent_settings WHERE agent_id = $1 AND key = $2',
      [agentId, key],
    )
    settings[key] = row?.value || null
  }
  res.json(settings)
})

// ---------------------------------------------------------------------------
// PUT /api/pipeline/settings/:agentId — Update pipeline settings
// ---------------------------------------------------------------------------
router.put('/settings/:agentId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const settings = req.body as Record<string, string>
  const allowedKeys = [
    'pipeline_enabled', 'pipeline_interval',
    'model_filter', 'model_cluster', 'model_dedup',
    'model_research', 'model_generate', 'model_image_generate',
    'prompt_image_generate',
  ]

  for (const [key, value] of Object.entries(settings)) {
    if (allowedKeys.includes(key) && value !== null && value !== undefined && value !== '') {
      await execute(
        `INSERT INTO agent_settings (id, agent_id, key, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (agent_id, key) DO UPDATE SET value = $4`,
        [crypto.randomUUID(), agentId, key, value],
      )
    }
  }

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// PATCH /api/pipeline/posts/:postId — Update a coverage post (status, edit)
// ---------------------------------------------------------------------------
router.patch('/posts/:postId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const postId = String(req.params.postId)
  const { status, title, summary } = req.body as { status?: string; title?: string; summary?: string }

  const updates: string[] = []
  const params: unknown[] = [postId]

  if (status) {
    params.push(status)
    updates.push(`status = $${params.length}`)
  }
  if (title) {
    params.push(title)
    updates.push(`title = $${params.length}`)
  }
  if (summary) {
    params.push(summary)
    updates.push(`summary = $${params.length}`)
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()')
    await execute(`UPDATE coverage_posts SET ${updates.join(', ')} WHERE id = $1`, params)
  }

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/pipeline/:agentId — Trigger an immediate pipeline run
// ---------------------------------------------------------------------------
router.post('/:agentId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)

  const agent = await queryOne<{ id: string }>('SELECT id FROM agents WHERE id = $1', [agentId])
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  // Check if already running
  const running = await queryOne<{ id: string }>(
    `SELECT id FROM pipeline_runs WHERE agent_id = $1 AND completed_at IS NULL LIMIT 1`,
    [agentId],
  )
  if (running) {
    res.status(409).json({ error: 'A pipeline run is already in progress for this agent' })
    return
  }

  // Create a queued run that the worker will pick up
  const runId = crypto.randomUUID()
  await execute(
    `INSERT INTO pipeline_runs (id, agent_id, started_at, current_step) VALUES ($1, $2, NOW(), 'queued')`,
    [runId, agentId],
  )

  // Ensure pipeline is enabled
  await execute(
    `INSERT INTO agent_settings (id, agent_id, key, value)
     VALUES ($1, $2, 'pipeline_enabled', 'true')
     ON CONFLICT (agent_id, key) DO UPDATE SET value = 'true'`,
    [crypto.randomUUID(), agentId],
  )

  res.json({ success: true, runId })
})

// ---------------------------------------------------------------------------
// DELETE /api/pipeline/:agentId — Cancel a queued/stuck run
// ---------------------------------------------------------------------------
router.delete('/:agentId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)

  await execute(
    `UPDATE pipeline_runs SET completed_at = NOW(), current_step = 'cancelled', error = 'Cancelled by user'
     WHERE agent_id = $1 AND completed_at IS NULL`,
    [agentId],
  )

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// GET /api/pipeline/:agentId/posts — Get generated coverage posts
// ---------------------------------------------------------------------------
router.get('/:agentId/posts', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100)
  const offset = parseInt(String(req.query.offset || '0'), 10)

  const posts = await query<Record<string, unknown>>(
    `SELECT cp.*,
       (SELECT COUNT(*) FROM coverage_source_articles WHERE coverage_post_id = cp.id) as source_count,
       (SELECT json_agg(json_build_object('platform', csp.platform, 'content', csp.content))
        FROM coverage_social_posts csp WHERE csp.coverage_post_id = cp.id) as social_posts
     FROM coverage_posts cp
     WHERE cp.agent_id = $1
     ORDER BY cp.created_at DESC
     LIMIT $2 OFFSET $3`,
    [agentId, limit, offset],
  )

  const total = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM coverage_posts WHERE agent_id = $1',
    [agentId],
  )

  res.json({ posts, total: total?.count || 0 })
})

// ---------------------------------------------------------------------------
// GET /api/pipeline/:agentId — Get pipeline status and recent runs
// ---------------------------------------------------------------------------
router.get('/:agentId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)

  const runs = await query<Record<string, unknown>>(
    `SELECT * FROM pipeline_runs WHERE agent_id = $1 ORDER BY started_at DESC LIMIT 10`,
    [agentId],
  )

  // Diagnostics
  const diagnostics = await queryOne<Record<string, unknown>>(`
    SELECT
      (SELECT COUNT(*) FROM agent_feeds WHERE agent_id = $1) as subscribed_feeds,
      (SELECT COUNT(*) FROM agent_feeds af JOIN feeds f ON f.id = af.feed_id
       WHERE af.agent_id = $1 AND f.status = 'active') as active_feeds,
      (SELECT COUNT(*) FROM articles a
       JOIN agent_feeds af ON af.feed_id = a.feed_id AND af.agent_id = $1) as total_articles,
      (SELECT COUNT(*) FROM agent_article_screenings
       WHERE agent_id = $1 AND is_relevant = 1) as total_relevant,
      (SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'pipeline_enabled') as pipeline_enabled,
      (SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'pipeline_interval') as pipeline_interval
  `, [agentId])

  res.json({ runs, diagnostics })
})

export default router
