import { Router, type Request, type Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import {
  publishToCms,
  testCmsConnection,
  fetchCmsCategories,
  plainTextToHtml,
  mapCategoryToCmsSlug,
  generateTags,
  getAgentSetting,
  setAgentSetting,
  linkArticleToDevelopingStory,
} from '../services/cmsClient.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// POST /api/cms/publish — Publish content to CMS
// ---------------------------------------------------------------------------
router.post('/publish', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId, title, content, slug, category, status, imageUrl } = req.body as {
    agentId: string
    title: string
    content: string
    slug?: string
    category?: string
    status?: 'draft' | 'published'
    imageUrl?: string
  }

  if (!agentId || !title || !content) {
    res.status(400).json({ error: 'agentId, title, and content are required' })
    return
  }

  const cmsCategory = await getAgentSetting(agentId, 'cms_category') || 'general'
  const cmsPublishStatus = (await getAgentSetting(agentId, 'cms_publish_status')) as 'draft' | 'published' || 'draft'
  const categorySlug = mapCategoryToCmsSlug(category || null, cmsCategory)
  const htmlContent = plainTextToHtml(content)
  const tags = generateTags(category || null, null)
  const excerpt = content.replace(/\n/g, ' ').slice(0, 200)
  const postSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

  const result = await publishToCms(agentId, {
    title,
    slug: postSlug,
    content: htmlContent,
    categorySlug,
    status: status || cmsPublishStatus,
    excerpt,
    tags,
    featuredImageUrl: imageUrl,
    seoTitle: title,
    seoDescription: excerpt,
    externalId: agentId,
  })

  if (result.success) {
    // Link to developing story if applicable
    const storyId = await getAgentSetting(agentId, 'cms_story_id')
    if (storyId && result.slug) {
      await linkArticleToDevelopingStory(agentId, storyId, result.slug, title, content, 'developing', imageUrl)
    }
    res.json(result)
  } else {
    res.status(502).json(result)
  }
})

// ---------------------------------------------------------------------------
// POST /api/cms/test — Test CMS connection
// ---------------------------------------------------------------------------
router.post('/test', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { url, apiKey } = req.body as { url: string; apiKey: string }
  if (!url || !apiKey) {
    res.status(400).json({ error: 'url and apiKey are required' })
    return
  }
  const result = await testCmsConnection(url, apiKey)
  res.json(result)
})

// ---------------------------------------------------------------------------
// GET /api/cms/categories — Fetch CMS categories
// ---------------------------------------------------------------------------
router.get('/categories', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const url = String(req.query.url || '')
  if (!url) {
    res.status(400).json({ error: 'url query parameter is required' })
    return
  }
  const categories = await fetchCmsCategories(url)
  res.json({ categories })
})

// ---------------------------------------------------------------------------
// GET /api/cms/settings/:agentId — Get CMS settings for an agent
// ---------------------------------------------------------------------------
router.get('/settings/:agentId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const keys = ['cms_enabled', 'cms_api_url', 'cms_api_key', 'cms_category', 'cms_publish_status', 'cms_story_id']
  const settings: Record<string, string | null> = {}
  for (const key of keys) {
    settings[key] = await getAgentSetting(agentId, key)
  }
  // Mask API key
  if (settings.cms_api_key) {
    settings.cms_api_key = settings.cms_api_key.slice(0, 8) + '...'
  }
  res.json(settings)
})

// ---------------------------------------------------------------------------
// PUT /api/cms/settings/:agentId — Update CMS settings for an agent
// ---------------------------------------------------------------------------
router.put('/settings/:agentId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const settings = req.body as Record<string, string>
  const allowedKeys = ['cms_enabled', 'cms_api_url', 'cms_api_key', 'cms_category', 'cms_publish_status']
  for (const [key, value] of Object.entries(settings)) {
    if (allowedKeys.includes(key)) {
      await setAgentSetting(agentId, key, value)
    }
  }
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/external/live-stories — CMS creates a live story agent
// ---------------------------------------------------------------------------
router.post('/external/live-stories', async (req: Request, res: Response): Promise<void> => {
  const externalApiKey = process.env.EXTERNAL_API_KEY
  if (!externalApiKey) {
    res.status(500).json({ error: 'EXTERNAL_API_KEY not configured' })
    return
  }

  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${externalApiKey}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { title, slug, summary, cmsStoryId, cmsApiUrl, cmsApiKey: cmsKey } = req.body as {
    title: string
    slug: string
    summary?: string
    cmsStoryId: string
    cmsApiUrl?: string
    cmsApiKey?: string
  }

  if (!title || !slug || !cmsStoryId) {
    res.status(400).json({ error: 'title, slug, and cmsStoryId are required' })
    return
  }

  try {
    const { query, execute } = await import('../database/connection.js')

    // Check if agent already exists for this story
    const existing = await query<{ agent_id: string }>(
      "SELECT agent_id FROM agent_settings WHERE key = 'cms_story_id' AND value = $1 LIMIT 1",
      [cmsStoryId],
    )

    if (existing.length > 0) {
      res.json({ agentId: existing[0].agent_id, action: 'resumed', message: 'Existing agent resumed' })
      return
    }

    // Create agent
    const agentId = crypto.randomUUID()
    const shortTitle = title.length > 40 ? title.substring(0, 40).replace(/\s+\S*$/, '...') : title
    const agentSlug = `live-${slug}`.substring(0, 50)

    await execute(
      `INSERT INTO agents (id, name, description, system_prompt, icon, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [agentId, `LIVE: ${shortTitle}`, summary || '', `Focus on live coverage of: ${title}`, 'Radio', new Date().toISOString()],
    )

    // Store CMS settings
    await setAgentSetting(agentId, 'cms_story_id', cmsStoryId)
    if (cmsApiUrl) await setAgentSetting(agentId, 'cms_api_url', cmsApiUrl)
    if (cmsKey) await setAgentSetting(agentId, 'cms_api_key', cmsKey)
    await setAgentSetting(agentId, 'cms_enabled', 'true')
    await setAgentSetting(agentId, 'cms_publish_status', 'published')

    res.status(201).json({
      agentId,
      slug: agentSlug,
      action: 'created',
      message: 'Agent created for live story',
    })
  } catch (error) {
    console.error('[External/live-stories] Error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /api/external/live-stories — CMS pauses/resumes/configures agent
// ---------------------------------------------------------------------------
router.patch('/external/live-stories', async (req: Request, res: Response): Promise<void> => {
  const externalApiKey = process.env.EXTERNAL_API_KEY
  if (!externalApiKey || req.headers.authorization !== `Bearer ${externalApiKey}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { cmsStoryId, action, cmsApiUrl, cmsApiKey: cmsKey } = req.body as {
    cmsStoryId: string
    action: 'pause' | 'resume' | 'configure-cms'
    cmsApiUrl?: string
    cmsApiKey?: string
  }

  if (!cmsStoryId || !action) {
    res.status(400).json({ error: 'cmsStoryId and action are required' })
    return
  }

  try {
    const { query } = await import('../database/connection.js')

    if (action === 'configure-cms') {
      if (!cmsApiUrl || !cmsKey) {
        res.status(400).json({ error: 'cmsApiUrl and cmsApiKey required' })
        return
      }
      const agents = await query<{ agent_id: string }>(
        "SELECT agent_id FROM agent_settings WHERE key = 'cms_story_id' AND value = $1",
        [cmsStoryId],
      )
      for (const row of agents) {
        await setAgentSetting(row.agent_id, 'cms_api_url', cmsApiUrl)
        await setAgentSetting(row.agent_id, 'cms_api_key', cmsKey)
        await setAgentSetting(row.agent_id, 'cms_enabled', 'true')
        await setAgentSetting(row.agent_id, 'cms_publish_status', 'published')
      }
      res.json({ action: 'configure-cms', configuredAgents: agents.map(a => a.agent_id) })
      return
    }

    const agents = await query<{ agent_id: string }>(
      "SELECT agent_id FROM agent_settings WHERE key = 'cms_story_id' AND value = $1 LIMIT 1",
      [cmsStoryId],
    )
    if (agents.length === 0) {
      res.status(404).json({ error: 'No agent found for this story' })
      return
    }

    res.json({ agentId: agents[0].agent_id, action, message: `Agent ${action}d successfully` })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/external/live-stories — Diagnostic endpoint
// ---------------------------------------------------------------------------
router.get('/external/live-stories', async (req: Request, res: Response): Promise<void> => {
  const externalApiKey = process.env.EXTERNAL_API_KEY
  if (!externalApiKey || req.headers.authorization !== `Bearer ${externalApiKey}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { query } = await import('../database/connection.js')
  const agents = await query<{ id: string; name: string }>(
    "SELECT a.id, a.name FROM agents a JOIN agent_settings s ON a.id = s.agent_id WHERE s.key = 'cms_story_id'",
  )
  res.json({ agents })
})

export default router
