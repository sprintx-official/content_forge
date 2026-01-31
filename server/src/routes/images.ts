import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody } from '../validation/middleware.js'
import { z } from 'zod'
import { generateImage } from '../services/imageProvider.js'
import { ProviderError } from '../services/aiProvider.js'
import { uploadToR2, deleteFromR2, downloadFromR2, isR2Configured } from '../services/r2.js'
import { autoRoute } from '../services/autoRouter.js'
import type { AuthenticatedRequest, ApiKeyRow, GeneratedImageRow } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const generateImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt too long'),
  width: z.number().int().min(256).max(4096).default(1024),
  height: z.number().int().min(256).max(4096).default(1024),
  style: z.string().max(50).default('natural'),
  modelId: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMAGE_COST: Record<string, number> = {
  'dall-e-3-1024x1024': 0.04,
  'dall-e-3-1024x1792': 0.08,
  'dall-e-3-1792x1024': 0.08,
}

function estimateCost(model: string, width: number, height: number): number {
  const key = `${model}-${width}x${height}`
  return IMAGE_COST[key] ?? 0.04
}

// ---------------------------------------------------------------------------
// POST /api/images/generate — Generate image
// ---------------------------------------------------------------------------

router.post('/generate', authenticate, validateBody(generateImageSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { prompt, width, height, style, modelId, provider: reqProvider } = req.body as {
    prompt: string; width: number; height: number; style: string; modelId?: string; provider?: string
  }

  // Resolve provider: use explicit model if provided, otherwise auto-route
  let provider: string
  let model: string
  let apiKey: string

  if (modelId && reqProvider && modelId !== 'auto' && reqProvider !== 'auto') {
    // User selected a specific model — look up API key for that provider
    const keyRow = await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1', [reqProvider]
    )
    if (!keyRow) {
      res.status(422).json({ error: `No active API key for ${reqProvider}. Configure one in Settings.` })
      return
    }
    provider = reqProvider
    model = modelId
    apiKey = keyRow.api_key
  } else {
    try {
      const routed = await autoRoute('image')
      provider = routed.provider
      model = routed.model
      apiKey = routed.apiKey
    } catch {
      res.status(422).json({ error: 'No AI model available for image generation. Configure an API key in Settings.' })
      return
    }
  }

  try {
    const result = await generateImage({
      prompt,
      provider,
      model,
      apiKey,
      size: { width, height },
      style,
    })

    const imageId = crypto.randomUUID()
    const r2Key = `images/${userId}/${imageId}.png`
    let url = `/api/images/${imageId}/file`

    // Upload to R2 if configured
    if (isR2Configured()) {
      await uploadToR2(r2Key, result.imageData, result.contentType)
    }

    const costUsd = estimateCost(model, width, height)
    const now = new Date().toISOString()

    await execute(
      `INSERT INTO generated_images (id, user_id, prompt, revised_prompt, r2_key, url, width, height, style, provider, model, cost_usd, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [imageId, userId, prompt, result.revisedPrompt || null, r2Key, url, width, height, style, provider, model, costUsd, now]
    )

    // If R2 is not configured, store image data in-memory (via a data URL for now)
    if (!isR2Configured()) {
      url = `data:image/png;base64,${result.imageData.toString('base64')}`
      await execute('UPDATE generated_images SET url = $1 WHERE id = $2', [url, imageId])
    }

    res.status(201).json({
      id: imageId,
      userId,
      prompt,
      revisedPrompt: result.revisedPrompt,
      r2Key,
      url,
      width,
      height,
      style,
      provider,
      model,
      costUsd,
      createdAt: now,
    })
  } catch (err) {
    if (err instanceof ProviderError) {
      const status = err.statusCode === 429 ? 429 : 502
      res.status(status).json({ error: err.message })
      return
    }
    console.error('Image generation error:', err)
    res.status(500).json({ error: 'Image generation failed. Please try again.' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/images — List user's images
// ---------------------------------------------------------------------------

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const offset = parseInt(req.query.offset as string) || 0

  const images = await query<GeneratedImageRow>(
    'SELECT * FROM generated_images WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  )

  res.json({ data: images })
})

// ---------------------------------------------------------------------------
// GET /api/images/:id — Get single image details
// ---------------------------------------------------------------------------

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const image = await queryOne<GeneratedImageRow>(
    'SELECT * FROM generated_images WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!image) {
    res.status(404).json({ error: 'Image not found' })
    return
  }

  res.json(image)
})

// ---------------------------------------------------------------------------
// GET /api/images/:id/file — Serve image file from R2
// ---------------------------------------------------------------------------

router.get('/:id/file', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const image = await queryOne<GeneratedImageRow>(
    'SELECT * FROM generated_images WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!image) {
    res.status(404).json({ error: 'Image not found' })
    return
  }

  if (!isR2Configured()) {
    // Redirect to stored URL (data URL or external)
    res.redirect(image.url)
    return
  }

  try {
    const { body, contentType } = await downloadFromR2(image.r2_key)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(body)
  } catch (err) {
    console.error('R2 download error:', err)
    res.status(500).json({ error: 'Failed to retrieve image' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/images/:id — Delete image
// ---------------------------------------------------------------------------

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const image = await queryOne<GeneratedImageRow>(
    'SELECT * FROM generated_images WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!image) {
    res.status(404).json({ error: 'Image not found' })
    return
  }

  // Delete from R2 if configured
  if (isR2Configured() && image.r2_key) {
    try {
      await deleteFromR2(image.r2_key)
    } catch (err) {
      console.error('R2 delete error (continuing):', err)
    }
  }

  await execute('DELETE FROM generated_images WHERE id = $1', [image.id])
  res.json({ success: true })
})

export default router
