import { Router, type Response } from 'express'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import {
  publishToCms,
  plainTextToHtml,
  mapCategoryToCmsSlug,
  generateTags,
  getAgentSetting,
  linkArticleToDevelopingStory,
} from '../services/cmsClient.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// Helper: format a raw coverage post row to camelCase for the frontend
// ---------------------------------------------------------------------------
function formatPost(row: Record<string, unknown>) {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agentName: row.agent_name,
    sourceCount: row.source_count,
    imageSquare: row.image_square,
    imageLandscape: row.image_landscape,
    imageVertical: row.image_vertical,
    imageHeadline: row.image_headline,
    workflowId: row.workflow_id,
  }
}

// ---------------------------------------------------------------------------
// GET /api/coverage — List coverage posts (across all agents or filtered)
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId, status, urgency, search, workflowId } = req.query
    const limit = Math.max(0, Math.min(parseInt(String(req.query.limit || '20'), 10), 100))
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10))

    const buildQuery = (useAgentIdFallback: boolean) => {
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
      if (workflowId && typeof workflowId === 'string' && !useAgentIdFallback) {
        params.push(workflowId)
        conditions.push(`cp.workflow_id = $${params.length}`)
      }

      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
      sql += ' ORDER BY cp.created_at DESC'
      params.push(limit)
      sql += ` LIMIT $${params.length}`
      params.push(offset)
      sql += ` OFFSET $${params.length}`

      return { sql, params, conditionCount: conditions.length }
    }

    // Primary query
    const primary = buildQuery(false)
    let posts = await query<Record<string, unknown>>(primary.sql, primary.params)

    // Fallback: if workflowId filter returned no results and agentId is provided, retry filtering by agent_id only
    let usedParams = primary
    if (posts.length === 0 && workflowId && typeof workflowId === 'string' && agentId && typeof agentId === 'string') {
      const fallback = buildQuery(true)
      posts = await query<Record<string, unknown>>(fallback.sql, fallback.params)
      usedParams = fallback
    }

    // Total count
    let countSql = 'SELECT COUNT(*) as count FROM coverage_posts cp'
    const countParams = usedParams.params.slice(0, usedParams.conditionCount)
    if (usedParams.conditionCount > 0) {
      // Rebuild conditions for count query from the used params
      const countConditions: string[] = []
      let paramIdx = 0
      if (agentId && typeof agentId === 'string') { paramIdx++; countConditions.push(`cp.agent_id = $${paramIdx}`) }
      if (status && typeof status === 'string') { paramIdx++; countConditions.push(`cp.status = $${paramIdx}`) }
      if (urgency && typeof urgency === 'string') { paramIdx++; countConditions.push(`cp.urgency = $${paramIdx}`) }
      if (search && typeof search === 'string') { paramIdx++; countConditions.push(`(cp.title ILIKE $${paramIdx} OR cp.summary ILIKE $${paramIdx})`) }
      if (workflowId && typeof workflowId === 'string' && usedParams === primary) { paramIdx++; countConditions.push(`cp.workflow_id = $${paramIdx}`) }
      if (countConditions.length > 0) countSql += ' WHERE ' + countConditions.join(' AND ')
    }
    const total = await queryOne<{ count: number }>(countSql, countParams)

    res.json({ posts: posts.map(formatPost), total: total?.count || 0 })
  } catch (err) {
    console.error('[GET /api/coverage] Error:', err)
    res.status(500).json({ error: 'Failed to fetch coverage posts' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/coverage/:id — Get a single coverage post with details
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
  } catch (err) {
    console.error('[GET /api/coverage/:id] Error:', err)
    res.status(500).json({ error: 'Failed to fetch coverage post' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /api/coverage/:id — Update a coverage post
// ---------------------------------------------------------------------------
router.patch('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
  } catch (err) {
    console.error('[PATCH /api/coverage/:id] Error:', err)
    res.status(500).json({ error: 'Failed to update coverage post' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/coverage/:id — Delete a coverage post
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id)
    await execute('DELETE FROM coverage_posts WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/coverage/:id] Error:', err)
    res.status(500).json({ error: 'Failed to delete coverage post' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /api/coverage/:id/social/:socialId — Edit a social post
// ---------------------------------------------------------------------------
router.patch('/:id/social/:socialId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const socialId = String(req.params.socialId)
    const { editedContent } = req.body as { editedContent: string }

    await execute(
      'UPDATE coverage_social_posts SET edited_content = $1 WHERE id = $2',
      [editedContent, socialId],
    )

    res.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/coverage/:id/social/:socialId] Error:', err)
    res.status(500).json({ error: 'Failed to update social post' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/coverage/stats — Dashboard stats
// ---------------------------------------------------------------------------
router.get('/stats/summary', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
  } catch (err) {
    console.error('[GET /api/coverage/stats/summary] Error:', err)
    res.status(500).json({ error: 'Failed to fetch coverage stats' })
  }
})

// ---------------------------------------------------------------------------
// POST /api/coverage/:id/publish-cms — Publish a coverage post to CMS
// ---------------------------------------------------------------------------
router.post('/:id/publish-cms', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id)
    const { status: publishStatus } = req.body as { status?: 'draft' | 'published' }

    const post = await queryOne<{
      id: string; agent_id: string; title: string; slug: string; summary: string;
      category: string; urgency: string; key_facts: string;
      image_landscape: string | null; image_square: string | null; cms_url: string | null
    }>(
      'SELECT id, agent_id, title, slug, summary, category, urgency, key_facts, image_landscape, image_square, cms_url FROM coverage_posts WHERE id = $1',
      [id],
    )

    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }

    if (post.cms_url) {
      res.status(400).json({ error: 'Already published to CMS', url: post.cms_url })
      return
    }

    const cmsEnabled = await getAgentSetting(post.agent_id, 'cms_enabled')
    if (cmsEnabled !== 'true') {
      res.status(400).json({ error: 'CMS is not enabled for this agent. Configure CMS settings first.' })
      return
    }

    const cmsCategory = (await getAgentSetting(post.agent_id, 'cms_category')) || 'general'
    const cmsPublishStatus = publishStatus || ((await getAgentSetting(post.agent_id, 'cms_publish_status')) as 'draft' | 'published') || 'draft'
    const categorySlug = mapCategoryToCmsSlug(post.category || null, cmsCategory)
    const htmlContent = plainTextToHtml(post.summary)
    const tags = generateTags(post.category || null, post.key_facts)
    const excerpt = post.summary.replace(/\n/g, ' ').slice(0, 200)
    const postSlug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

    const result = await publishToCms(post.agent_id, {
      title: post.title,
      slug: postSlug,
      content: htmlContent,
      categorySlug,
      status: cmsPublishStatus,
      excerpt,
      tags,
      featuredImageUrl: post.image_landscape || post.image_square || undefined,
      seoTitle: post.title,
      seoDescription: excerpt,
      isBreaking: post.urgency === 'critical',
      externalId: post.id,
    })

    if (result.success) {
      await execute(
        `UPDATE coverage_posts SET cms_slug = $1, cms_url = $2, status = 'published', updated_at = NOW() WHERE id = $3`,
        [result.slug ?? null, result.url ?? null, id],
      )

      // Link to developing story if applicable
      const storyId = await getAgentSetting(post.agent_id, 'cms_story_id')
      if (storyId && result.slug) {
        await linkArticleToDevelopingStory(post.agent_id, storyId, result.slug, post.title, post.summary, post.urgency, post.image_landscape || post.image_square || undefined)
      }

      res.json({ success: true, url: result.url, slug: result.slug })
    } else {
      res.status(502).json({ success: false, error: result.error })
    }
  } catch (err) {
    console.error('[POST /api/coverage/:id/publish-cms] Error:', err)
    res.status(500).json({ error: 'Failed to publish to CMS' })
  }
})

export default router
