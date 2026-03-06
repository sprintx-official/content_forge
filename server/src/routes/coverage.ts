import { Router, type Response } from 'express'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/coverage — List coverage posts (across all agents or filtered)
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId, status, urgency, search } = req.query
  const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100)
  const offset = parseInt(String(req.query.offset || '0'), 10)

  let sql = `SELECT cp.*,
    a.name as agent_name,
    (SELECT COUNT(*) FROM coverage_source_articles WHERE coverage_post_id = cp.id) as source_count
    FROM coverage_posts cp
    JOIN agents a ON a.id = cp.agent_id`
  const params: unknown[] = []
  const conditions: string[] = []

  if (agentId && typeof agentId === 'string') {
    params.push(agentId)
    conditions.push(`cp.agent_id = $${params.length}`)
  }
  if (status && typeof status === 'string') {
    params.push(status)
    conditions.push(`cp.status = $${params.length}`)
  }
  if (urgency && typeof urgency === 'string') {
    params.push(urgency)
    conditions.push(`cp.urgency = $${params.length}`)
  }
  if (search && typeof search === 'string') {
    params.push(`%${search}%`)
    conditions.push(`(cp.title ILIKE $${params.length} OR cp.summary ILIKE $${params.length})`)
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY cp.created_at DESC'
  params.push(limit)
  sql += ` LIMIT $${params.length}`
  params.push(offset)
  sql += ` OFFSET $${params.length}`

  const posts = await query<Record<string, unknown>>(sql, params)

  // Total count
  let countSql = 'SELECT COUNT(*) as count FROM coverage_posts cp'
  if (conditions.length > 0) {
    countSql += ' WHERE ' + conditions.join(' AND ')
  }
  const total = await queryOne<{ count: number }>(countSql, params.slice(0, conditions.length ? params.length - 2 : 0))

  res.json({ posts, total: total?.count || 0 })
})

// ---------------------------------------------------------------------------
// GET /api/coverage/:id — Get a single coverage post with details
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)

  const post = await queryOne<Record<string, unknown>>(
    `SELECT cp.*, a.name as agent_name
     FROM coverage_posts cp
     JOIN agents a ON a.id = cp.agent_id
     WHERE cp.id = $1`,
    [id],
  )

  if (!post) {
    res.status(404).json({ error: 'Post not found' })
    return
  }

  // Get social posts
  const socialPosts = await query<Record<string, unknown>>(
    'SELECT * FROM coverage_social_posts WHERE coverage_post_id = $1',
    [id],
  )

  // Get source articles
  const sources = await query<Record<string, unknown>>(
    `SELECT a.id, a.title, a.url, a.summary, f.title as feed_title
     FROM coverage_source_articles csa
     JOIN articles a ON a.id = csa.article_id
     JOIN feeds f ON f.id = a.feed_id
     WHERE csa.coverage_post_id = $1`,
    [id],
  )

  res.json({ post, socialPosts, sources })
})

// ---------------------------------------------------------------------------
// PATCH /api/coverage/:id — Update a coverage post
// ---------------------------------------------------------------------------
router.patch('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { status, title, summary } = req.body as { status?: string; title?: string; summary?: string }

  const updates: string[] = []
  const params: unknown[] = [id]

  if (status) { params.push(status); updates.push(`status = $${params.length}`) }
  if (title) { params.push(title); updates.push(`title = $${params.length}`) }
  if (summary) { params.push(summary); updates.push(`summary = $${params.length}`) }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()')
    await execute(`UPDATE coverage_posts SET ${updates.join(', ')} WHERE id = $1`, params)
  }

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// DELETE /api/coverage/:id — Delete a coverage post
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  await execute('DELETE FROM coverage_posts WHERE id = $1', [id])
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// PATCH /api/coverage/:id/social/:socialId — Edit a social post
// ---------------------------------------------------------------------------
router.patch('/:id/social/:socialId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const socialId = String(req.params.socialId)
  const { editedContent } = req.body as { editedContent: string }

  await execute(
    'UPDATE coverage_social_posts SET edited_content = $1 WHERE id = $2',
    [editedContent, socialId],
  )

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// GET /api/coverage/stats — Dashboard stats
// ---------------------------------------------------------------------------
router.get('/stats/summary', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stats = await queryOne<Record<string, unknown>>(`
    SELECT
      (SELECT COUNT(*) FROM coverage_posts) as total_posts,
      (SELECT COUNT(*) FROM coverage_posts WHERE status = 'published') as published_posts,
      (SELECT COUNT(*) FROM coverage_posts WHERE status = 'draft') as draft_posts,
      (SELECT COUNT(*) FROM coverage_posts WHERE created_at > NOW() - INTERVAL '24 hours') as posts_today,
      (SELECT COUNT(*) FROM articles) as total_articles,
      (SELECT COUNT(*) FROM articles WHERE created_at > NOW() - INTERVAL '24 hours') as articles_today,
      (SELECT COUNT(*) FROM feeds WHERE status = 'active') as active_feeds,
      (SELECT COUNT(DISTINCT agent_id) FROM agent_settings WHERE key = 'pipeline_enabled' AND value = 'true') as active_pipelines
  `)

  res.json(stats || {})
})

export default router
