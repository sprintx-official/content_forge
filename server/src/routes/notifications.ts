import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { buildAndSendDigest } from '../services/email/digestBuilder.js'
import { getVapidPublicKey, sendPushNotification } from '../services/push.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/notifications/preferences — Get user's email preferences
// ---------------------------------------------------------------------------
router.get('/preferences', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  let prefs = await queryOne<Record<string, unknown>>(
    'SELECT * FROM email_preferences WHERE user_id = $1',
    [userId],
  )

  if (!prefs) {
    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO email_preferences (id, user_id) VALUES ($1, $2)`,
      [id, userId],
    )
    prefs = { id, user_id: userId, digest_frequency: 'daily', breaking_news: 1, timezone: 'UTC' }
  }

  res.json({ preferences: prefs })
})

// ---------------------------------------------------------------------------
// PUT /api/notifications/preferences — Update email preferences
// ---------------------------------------------------------------------------
router.put('/preferences', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { digestFrequency, breakingNews, timezone } = req.body as {
    digestFrequency?: 'daily' | 'weekly' | 'none'
    breakingNews?: boolean
    timezone?: string
  }

  // Upsert
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM email_preferences WHERE user_id = $1',
    [userId],
  )

  if (existing) {
    await execute(
      `UPDATE email_preferences
       SET digest_frequency = COALESCE($1, digest_frequency),
           breaking_news = COALESCE($2, breaking_news),
           timezone = COALESCE($3, timezone)
       WHERE user_id = $4`,
      [
        digestFrequency ?? null,
        breakingNews != null ? (breakingNews ? 1 : 0) : null,
        timezone ?? null,
        userId,
      ],
    )
  } else {
    const id = crypto.randomUUID()
    await execute(
      `INSERT INTO email_preferences (id, user_id, digest_frequency, breaking_news, timezone)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, digestFrequency || 'daily', breakingNews !== false ? 1 : 0, timezone || 'UTC'],
    )
  }

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/notifications/test-digest — Send a test digest email
// ---------------------------------------------------------------------------
router.post('/test-digest', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const user = await queryOne<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId])
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  try {
    await buildAndSendDigest(userId, user.email, 'daily')
    res.json({ success: true, message: 'Test digest sent' })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send digest' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/notifications/vapid-key — Get VAPID public key for push subscriptions
// ---------------------------------------------------------------------------
router.get('/vapid-key', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const key = getVapidPublicKey()
  if (!key) {
    res.status(404).json({ error: 'Push notifications not configured' })
    return
  }
  res.json({ vapidPublicKey: key })
})

// ---------------------------------------------------------------------------
// POST /api/notifications/push/subscribe — Register push subscription
// ---------------------------------------------------------------------------
router.post('/push/subscribe', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { endpoint, keys } = req.body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'endpoint and keys (p256dh, auth) are required' })
    return
  }

  // Upsert by endpoint
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM push_subscriptions WHERE endpoint = $1',
    [endpoint],
  )

  if (existing) {
    await execute(
      'UPDATE push_subscriptions SET user_id = $1, keys_json = $2 WHERE id = $3',
      [userId, JSON.stringify(keys), existing.id],
    )
  } else {
    const id = crypto.randomUUID()
    await execute(
      'INSERT INTO push_subscriptions (id, user_id, endpoint, keys_json) VALUES ($1, $2, $3, $4)',
      [id, userId, endpoint, JSON.stringify(keys)],
    )
  }

  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// DELETE /api/notifications/push/subscribe — Unregister push subscription
// ---------------------------------------------------------------------------
router.delete('/push/subscribe', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { endpoint } = req.body as { endpoint: string }

  if (!endpoint) {
    res.status(400).json({ error: 'endpoint is required' })
    return
  }

  await execute(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
    [userId, endpoint],
  )
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/notifications/push/test — Send a test push notification
// ---------------------------------------------------------------------------
router.post('/push/test', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  try {
    await sendPushNotification(userId, 'ContentForge Test', 'Push notifications are working!', '/newsroom')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Push notification failed' })
  }
})

export default router
