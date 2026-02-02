import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody } from '../validation/middleware.js'
import { z } from 'zod'
import { generateVideo, extendVideo } from '../services/videoProvider.js'
import { ProviderError } from '../services/aiProvider.js'
import { uploadToR2, deleteFromR2, downloadFromR2, isR2Configured } from '../services/r2.js'
import { autoRoute } from '../services/autoRouter.js'
import type { AuthenticatedRequest, ApiKeyRow, GeneratedVideoRow } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const generateVideoSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt too long'),
  aspectRatio: z.string().max(20).default('16:9'),
  durationSeconds: z.number().int().min(5).max(8).default(8),
  modelId: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Veo pricing (estimated per video)
const VIDEO_COST: Record<string, number> = {
  'veo-3.0-generate-001': 0.50,
  'veo-3.1-generate-preview': 0.50,
  'veo-3.1-fast-generate-preview': 0.25,
}

function estimateCost(model: string): number {
  return VIDEO_COST[model] ?? 0.50
}

// ---------------------------------------------------------------------------
// POST /api/videos/generate — Generate video
// ---------------------------------------------------------------------------

router.post('/generate', authenticate, validateBody(generateVideoSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { prompt, aspectRatio, durationSeconds, modelId, provider: reqProvider } = req.body as {
    prompt: string; aspectRatio: string; durationSeconds: number; modelId?: string; provider?: string
  }

  // Resolve provider
  let provider: string
  let model: string
  let apiKey: string

  if (modelId && reqProvider && modelId !== 'auto' && reqProvider !== 'auto') {
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
      const routed = await autoRoute('video')
      provider = routed.provider
      model = routed.model
      apiKey = routed.apiKey
    } catch {
      res.status(422).json({ error: 'No AI model available for video generation. Configure a Google API key in Settings.' })
      return
    }
  }

  try {
    const result = await generateVideo({
      prompt,
      model,
      apiKey,
      aspectRatio,
      durationSeconds,
    })

    const videoId = crypto.randomUUID()
    const r2Key = `videos/${userId}/${videoId}.mp4`
    let url = `/api/videos/${videoId}/file`

    console.log(`[Video] Generated ${result.videoData.length} bytes, R2 configured: ${isR2Configured()}`)

    if (isR2Configured()) {
      await uploadToR2(r2Key, result.videoData, result.contentType)
    } else {
      // No R2: store as base64 data URL (videos can be large, but works for dev)
      url = `data:${result.contentType};base64,${result.videoData.toString('base64')}`
    }

    const costUsd = estimateCost(model)
    const now = new Date().toISOString()

    await execute(
      `INSERT INTO generated_videos (id, user_id, prompt, r2_key, url, aspect_ratio, duration_seconds, provider, model, cost_usd, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [videoId, userId, prompt, r2Key, url, aspectRatio, durationSeconds, provider, model, costUsd, now]
    )

    res.status(201).json({
      id: videoId,
      userId,
      prompt,
      r2Key,
      url,
      aspectRatio,
      durationSeconds,
      provider,
      model,
      costUsd,
      createdAt: now,
    })
  } catch (err) {
    if (err instanceof ProviderError) {
      console.error(`Video ProviderError [${err.statusCode}]:`, err.message)
      const status = err.statusCode === 429 ? 429 : 502
      res.status(status).json({ error: err.message })
      return
    }
    console.error('Video generation error:', err)
    res.status(500).json({ error: 'Video generation failed. Please try again.' })
  }
})

// ---------------------------------------------------------------------------
// POST /api/videos/extend — Extend (scene-continue) an existing video
// ---------------------------------------------------------------------------

const extendVideoSchema = z.object({
  sourceVideoId: z.string().min(1, 'Source video ID is required'),
  prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt too long'),
})

router.post('/extend', authenticate, validateBody(extendVideoSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { sourceVideoId, prompt } = req.body as { sourceVideoId: string; prompt: string }

  // 1. Look up source video, verify ownership
  const sourceVideo = await queryOne<GeneratedVideoRow>(
    'SELECT * FROM generated_videos WHERE id = $1 AND user_id = $2',
    [sourceVideoId, userId]
  )
  if (!sourceVideo) {
    res.status(404).json({ error: 'Source video not found' })
    return
  }

  // 2. Retrieve source video data (from R2 or data URL)
  let sourceVideoData: Buffer
  if (isR2Configured() && sourceVideo.r2_key) {
    const { body } = await downloadFromR2(sourceVideo.r2_key)
    sourceVideoData = body
  } else if (sourceVideo.url.startsWith('data:')) {
    const base64Part = sourceVideo.url.split(',')[1]
    sourceVideoData = Buffer.from(base64Part, 'base64')
  } else {
    res.status(422).json({ error: 'Cannot retrieve source video data for extension' })
    return
  }

  // 3. Resolve API key (use same provider as source video)
  const keyRow = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1',
    [sourceVideo.provider]
  )
  if (!keyRow) {
    res.status(422).json({ error: `No active API key for ${sourceVideo.provider}. Configure one in Settings.` })
    return
  }

  const clipIndex = (sourceVideo.clip_index ?? 0) + 1

  try {
    const result = await extendVideo({
      prompt,
      model: sourceVideo.model,
      apiKey: keyRow.api_key,
      sourceVideoData,
    })

    const videoId = crypto.randomUUID()
    const r2Key = `videos/${userId}/${videoId}.mp4`
    let url = `/api/videos/${videoId}/file`

    console.log(`[Video] Extended ${result.videoData.length} bytes from ${sourceVideoId}, R2 configured: ${isR2Configured()}`)

    if (isR2Configured()) {
      await uploadToR2(r2Key, result.videoData, result.contentType)
    } else {
      url = `data:${result.contentType};base64,${result.videoData.toString('base64')}`
    }

    const costUsd = estimateCost(sourceVideo.model)
    const now = new Date().toISOString()

    await execute(
      `INSERT INTO generated_videos (id, user_id, prompt, r2_key, url, aspect_ratio, duration_seconds, provider, model, cost_usd, created_at, source_video_id, clip_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [videoId, userId, prompt, r2Key, url, sourceVideo.aspect_ratio, sourceVideo.duration_seconds, sourceVideo.provider, sourceVideo.model, costUsd, now, sourceVideoId, clipIndex]
    )

    res.status(201).json({
      id: videoId,
      userId,
      prompt,
      r2Key,
      url,
      aspectRatio: sourceVideo.aspect_ratio,
      durationSeconds: sourceVideo.duration_seconds,
      provider: sourceVideo.provider,
      model: sourceVideo.model,
      costUsd,
      createdAt: now,
      sourceVideoId,
      clipIndex: clipIndex,
    })
  } catch (err) {
    if (err instanceof ProviderError) {
      console.error(`Video extend ProviderError [${err.statusCode}]:`, err.message)
      const status = err.statusCode === 429 ? 429 : 502
      res.status(status).json({ error: err.message })
      return
    }
    console.error('Video extension error:', err)
    res.status(500).json({ error: 'Video extension failed. Please try again.' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/videos — List user's videos
// ---------------------------------------------------------------------------

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const offset = parseInt(req.query.offset as string) || 0

  const videos = await query<GeneratedVideoRow>(
    'SELECT * FROM generated_videos WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  )

  res.json({ data: videos })
})

// ---------------------------------------------------------------------------
// GET /api/videos/:id/file — Serve video file from R2
// ---------------------------------------------------------------------------

router.get('/:id/file', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const video = await queryOne<GeneratedVideoRow>(
    'SELECT * FROM generated_videos WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!video) {
    res.status(404).json({ error: 'Video not found' })
    return
  }

  if (!isR2Configured()) {
    // Redirect to stored URL (data URL or external)
    res.redirect(video.url)
    return
  }

  try {
    const { body, contentType } = await downloadFromR2(video.r2_key)
    res.setHeader('Content-Type', contentType || 'video/mp4')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(body)
  } catch (err) {
    console.error('R2 video download error:', err)
    res.status(500).json({ error: 'Failed to retrieve video' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/videos/:id — Delete video
// ---------------------------------------------------------------------------

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const video = await queryOne<GeneratedVideoRow>(
    'SELECT * FROM generated_videos WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!video) {
    res.status(404).json({ error: 'Video not found' })
    return
  }

  if (isR2Configured() && video.r2_key) {
    try {
      await deleteFromR2(video.r2_key)
    } catch (err) {
      console.error('R2 delete error (continuing):', err)
    }
  }

  await execute('DELETE FROM generated_videos WHERE id = $1', [video.id])
  res.json({ success: true })
})

export default router
