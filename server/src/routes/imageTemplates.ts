import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { createDefaultTemplate, createNewsOverlayTemplate, type ImageTemplate } from '../services/templateTypes.js'

// Lazy-load compositor — canvas may not be available
let compositeFromTemplate: typeof import('../services/imageCompositor.js').compositeFromTemplate | null = null
import('../services/imageCompositor.js')
  .then(m => { compositeFromTemplate = m.compositeFromTemplate })
  .catch(() => { console.warn('[ImageTemplates] canvas not available — preview disabled') })
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/image-templates/presets — List built-in template presets
// ---------------------------------------------------------------------------
router.get('/presets', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({
    presets: [
      { name: 'Default', id: 'default', description: 'Full-bleed image with adaptive gradient and keyword-highlighted headlines' },
      { name: 'News Overlay', id: 'news-overlay', description: 'Bold news style with colored keyword highlights' },
    ],
  })
})

// ---------------------------------------------------------------------------
// GET /api/image-templates/presets/:presetId — Get preset template data
// ---------------------------------------------------------------------------
router.get('/presets/:presetId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const presetId = String(req.params.presetId)

  let template: ImageTemplate
  if (presetId === 'news-overlay') {
    template = createNewsOverlayTemplate()
  } else {
    template = createDefaultTemplate()
  }

  res.json({ template })
})

// ---------------------------------------------------------------------------
// GET /api/image-templates/library — List all templates in library
// ---------------------------------------------------------------------------
router.get('/library', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const rows = await query<{ id: string; name: string; template_json: string; created_at: string; updated_at: string }>(
    `SELECT id, name, template_json, created_at, updated_at FROM image_template_library ORDER BY updated_at DESC`,
  )
  res.json({
    templates: rows.map((r) => {
      try {
        const parsed = JSON.parse(r.template_json) as ImageTemplate
        return {
          id: r.id,
          name: r.name,
          elements: parsed.elements ?? [],
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }
      } catch {
        return {
          id: r.id,
          name: r.name,
          elements: [],
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }
      }
    }),
  })
})

// ---------------------------------------------------------------------------
// POST /api/image-templates/library — Create new template in library
// ---------------------------------------------------------------------------
router.post('/library', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, template } = req.body as { name: string; template: ImageTemplate }
  if (!name || !template) {
    res.status(400).json({ error: 'name and template required' })
    return
  }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO image_template_library (id, name, template_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
    [id, name, JSON.stringify(template), now, now],
  )
  res.json({ id, name })
})

// ---------------------------------------------------------------------------
// PUT /api/image-templates/library/:id — Update template in library
// ---------------------------------------------------------------------------
router.put('/library/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const { name, template } = req.body as { name?: string; template?: ImageTemplate }
  const now = new Date().toISOString()
  if (name) {
    await execute(`UPDATE image_template_library SET name = $1, updated_at = $2 WHERE id = $3`, [name, now, id])
  }
  if (template) {
    await execute(`UPDATE image_template_library SET template_json = $1, updated_at = $2 WHERE id = $3`, [JSON.stringify(template), now, id])
  }
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// DELETE /api/image-templates/library/:id — Delete template from library
// ---------------------------------------------------------------------------
router.delete('/library/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await execute(`DELETE FROM image_template_library WHERE id = $1`, [req.params.id])
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/image-templates/preview — Generate a preview composite
// (Must be before /:agentId catch-all routes)
// ---------------------------------------------------------------------------
router.post('/preview', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { template, headline, format, backgroundUrl } = req.body as {
    template: ImageTemplate
    headline: string
    format?: 'square' | 'landscape'
    backgroundUrl?: string
  }

  if (!template || !headline) {
    res.status(400).json({ error: 'template and headline are required' })
    return
  }

  if (!compositeFromTemplate) {
    res.status(503).json({ error: 'Image compositing not available (canvas not installed)' })
    return
  }

  let backgroundBuffer: Buffer | null = null
  if (backgroundUrl) {
    try {
      const response = await fetch(backgroundUrl)
      backgroundBuffer = Buffer.from(await response.arrayBuffer())
    } catch {
      // Generate a solid gradient background as fallback
    }
  }

  // Fallback: create a dark gradient background
  if (!backgroundBuffer) {
    try {
      const { createCanvas: cc } = await import('canvas')
      const w = format === 'landscape' ? 1200 : 1080
      const h = format === 'landscape' ? 627 : 1080
      const c = cc(w, h)
      const cx = c.getContext('2d')
      const grad = cx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, '#1a1a2e')
      grad.addColorStop(1, '#16213e')
      cx.fillStyle = grad
      cx.fillRect(0, 0, w, h)
      backgroundBuffer = c.toBuffer('image/png')
    } catch {
      res.status(503).json({ error: 'Canvas not available for fallback background' })
      return
    }
  }

  const composited = await compositeFromTemplate(
    template,
    format || 'square',
    {
      backgroundBuffer,
      headline,
      category: null,
      slug: 'preview',
      qrUrl: null,
    },
  )

  const dataUrl = `data:image/png;base64,${composited.toString('base64')}`
  res.json({ preview: dataUrl })
})

// ---------------------------------------------------------------------------
// GET /api/image-templates/:agentId/assignments — Get agent's assigned templates
// ---------------------------------------------------------------------------
router.get('/:agentId/assignments', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const row = await queryOne<{ value: string }>(
    `SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'assigned_template_ids'`,
    [req.params.agentId],
  )
  let templateIds: string[] = []
  if (row) {
    try { templateIds = JSON.parse(row.value) as string[] } catch { /* corrupted data */ }
  }
  res.json({ templateIds })
})

// ---------------------------------------------------------------------------
// PUT /api/image-templates/:agentId/assignments — Set agent's assigned templates
// ---------------------------------------------------------------------------
router.put('/:agentId/assignments', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { templateIds } = req.body as { templateIds: string[] }
  const agentId = req.params.agentId
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM agent_settings WHERE agent_id = $1 AND key = 'assigned_template_ids'`,
    [agentId],
  )
  if (existing) {
    await execute(`UPDATE agent_settings SET value = $1 WHERE id = $2`, [JSON.stringify(templateIds), existing.id])
  } else {
    await execute(
      `INSERT INTO agent_settings (id, agent_id, key, value) VALUES ($1, $2, 'assigned_template_ids', $3)`,
      [crypto.randomUUID(), agentId, JSON.stringify(templateIds)],
    )
  }
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// GET /api/image-templates/:agentId — Get agent's custom template (or default)
// ---------------------------------------------------------------------------
router.get('/:agentId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)

  const row = await queryOne<{ value: string }>(
    `SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'image_template'`,
    [agentId],
  )

  if (row) {
    try {
      const template = JSON.parse(row.value) as ImageTemplate
      res.json({ template, isCustom: true })
      return
    } catch { /* fall through to default */ }
  }

  res.json({ template: createDefaultTemplate(), isCustom: false })
})

// ---------------------------------------------------------------------------
// PUT /api/image-templates/:agentId — Save agent's custom template
// ---------------------------------------------------------------------------
router.put('/:agentId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  const { template } = req.body as { template: ImageTemplate }

  if (!template || !template.elements) {
    res.status(400).json({ error: 'template with elements is required' })
    return
  }

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM agent_settings WHERE agent_id = $1 AND key = 'image_template'`,
    [agentId],
  )

  if (existing) {
    await execute(
      `UPDATE agent_settings SET value = $1 WHERE id = $2`,
      [JSON.stringify(template), existing.id],
    )
  } else {
    await execute(
      `INSERT INTO agent_settings (id, agent_id, key, value) VALUES ($1, $2, 'image_template', $3)`,
      [crypto.randomUUID(), agentId, JSON.stringify(template)],
    )
  }

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// DELETE /api/image-templates/:agentId — Reset to default template
// ---------------------------------------------------------------------------
router.delete('/:agentId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agentId = String(req.params.agentId)
  await execute(
    `DELETE FROM agent_settings WHERE agent_id = $1 AND key = 'image_template'`,
    [agentId],
  )
  res.json({ success: true })
})

export default router
