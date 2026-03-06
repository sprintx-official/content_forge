import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/feeds — List all feeds
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, search } = req.query
  let sql = 'SELECT * FROM feeds'
  const params: string[] = []
  const conditions: string[] = []

  if (status && typeof status === 'string') {
    conditions.push(`status = $${params.length + 1}`)
    params.push(status)
  }
  if (search && typeof search === 'string') {
    conditions.push(`(title ILIKE $${params.length + 1} OR url ILIKE $${params.length + 1})`)
    params.push(`%${search}%`)
  }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY created_at DESC'

  const feeds = await query<Record<string, unknown>>(sql, params)
  res.json({ feeds })
})

// ---------------------------------------------------------------------------
// POST /api/feeds — Add a new feed
// ---------------------------------------------------------------------------
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { url, title, tier } = req.body as { url: string; title?: string; tier?: string }
  if (!url) {
    res.status(400).json({ error: 'url is required' })
    return
  }

  // Check for duplicate
  const existing = await queryOne<{ id: string }>('SELECT id FROM feeds WHERE url = $1', [url])
  if (existing) {
    res.status(409).json({ error: 'Feed already exists', feedId: existing.id })
    return
  }

  // Validate and fetch feed info
  let feedTitle = title || ''
  let siteUrl = ''
  let description = ''

  try {
    const Parser = (await import('rss-parser')).default
    const parser = new Parser({ timeout: 10000 })
    const feed = await parser.parseURL(url)
    feedTitle = feedTitle || feed.title || ''
    siteUrl = feed.link || ''
    description = feed.description || ''
  } catch {
    // Feed might be temporarily down, still allow adding
  }

  const id = crypto.randomUUID()
  await execute(
    `INSERT INTO feeds (id, url, title, site_url, description, tier, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, url, feedTitle, siteUrl, description, tier || 'standard', new Date().toISOString()],
  )

  res.status(201).json({ id, url, title: feedTitle, tier: tier || 'standard' })
})

// ---------------------------------------------------------------------------
// POST /api/feeds/validate — Validate a feed URL
// ---------------------------------------------------------------------------
router.post('/validate', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { url } = req.body as { url: string }
  if (!url) {
    res.status(400).json({ error: 'url is required' })
    return
  }

  try {
    const Parser = (await import('rss-parser')).default
    const parser = new Parser({ timeout: 10000 })
    const feed = await parser.parseURL(url)
    res.json({
      valid: true,
      title: feed.title || '',
      description: feed.description || '',
      link: feed.link || '',
      itemCount: feed.items?.length || 0,
    })
  } catch (err) {
    res.json({
      valid: false,
      error: err instanceof Error ? err.message : 'Failed to parse feed',
    })
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/feeds/:id — Delete a feed
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  await execute('DELETE FROM feeds WHERE id = $1', [id])
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// PATCH /api/feeds/:id — Update feed tier/status
// ---------------------------------------------------------------------------
router.patch('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { tier, status } = req.body as { tier?: string; status?: string }
  const updates: string[] = []
  const params: string[] = [id]

  if (tier) {
    params.push(tier)
    updates.push(`tier = $${params.length}`)
  }
  if (status) {
    params.push(status)
    updates.push(`status = $${params.length}`)
  }

  if (updates.length > 0) {
    await execute(`UPDATE feeds SET ${updates.join(', ')} WHERE id = $1`, params)
  }
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// GET /api/feeds/agent/:agentId — Get feeds subscribed by an agent
// ---------------------------------------------------------------------------
router.get('/agent/:agentId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const feeds = await query<Record<string, unknown>>(
    `SELECT f.*, af.created_at as subscribed_at
     FROM feeds f
     JOIN agent_feeds af ON af.feed_id = f.id
     WHERE af.agent_id = $1
     ORDER BY f.title`,
    [agentId],
  )
  res.json({ feeds })
})

// ---------------------------------------------------------------------------
// POST /api/feeds/agent/:agentId/subscribe — Subscribe agent to feeds
// ---------------------------------------------------------------------------
router.post('/agent/:agentId/subscribe', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const { feedIds } = req.body as { feedIds: string[] }
  if (!feedIds || !Array.isArray(feedIds)) {
    res.status(400).json({ error: 'feedIds array is required' })
    return
  }

  let subscribed = 0
  for (const feedId of feedIds) {
    try {
      await execute(
        `INSERT INTO agent_feeds (id, agent_id, feed_id) VALUES ($1, $2, $3)
         ON CONFLICT (agent_id, feed_id) DO NOTHING`,
        [crypto.randomUUID(), agentId, feedId],
      )
      subscribed++
    } catch { /* skip duplicates */ }
  }

  res.json({ subscribed })
})

// ---------------------------------------------------------------------------
// DELETE /api/feeds/agent/:agentId/:feedId — Unsubscribe agent from feed
// ---------------------------------------------------------------------------
router.delete('/agent/:agentId/:feedId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const feedId = String(req.params.feedId)
  await execute('DELETE FROM agent_feeds WHERE agent_id = $1 AND feed_id = $2', [agentId, feedId])
  res.json({ success: true })
})

export default router
