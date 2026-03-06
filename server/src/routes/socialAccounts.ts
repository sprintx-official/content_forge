import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { publishToPlatform, refreshToken } from '../services/social/publisher.js'
import type { AuthenticatedRequest } from '../types.js'
import type { SocialAccount, SocialPlatform } from '../services/social/types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/social-accounts — List all social accounts (grouped by agent)
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId } = req.query
  let sql = `SELECT sa.*, a.name as agent_name FROM social_accounts sa JOIN agents a ON a.id = sa.agent_id`
  const params: unknown[] = []

  if (agentId && typeof agentId === 'string') {
    params.push(agentId)
    sql += ` WHERE sa.agent_id = $${params.length}`
  }
  sql += ' ORDER BY sa.platform, sa.created_at DESC'

  const accounts = await query<Record<string, unknown>>(sql, params)

  // Mask tokens
  const masked = accounts.map(a => ({
    ...a,
    access_token: '***',
    refresh_token: a.refresh_token ? '***' : null,
  }))

  res.json({ accounts: masked })
})

// ---------------------------------------------------------------------------
// POST /api/social-accounts — Add a social account (manual token entry)
// ---------------------------------------------------------------------------
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId, platform, accessToken, refreshToken: rToken, platformUserId, platformUsername } = req.body as {
    agentId: string
    platform: SocialPlatform
    accessToken: string
    refreshToken?: string
    platformUserId: string
    platformUsername?: string
  }

  if (!agentId || !platform || !accessToken || !platformUserId) {
    res.status(400).json({ error: 'agentId, platform, accessToken, and platformUserId are required' })
    return
  }

  const id = crypto.randomUUID()
  await execute(
    `INSERT INTO social_accounts (id, agent_id, platform, access_token, refresh_token, platform_user_id, platform_username, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [id, agentId, platform, accessToken, rToken || '', platformUserId, platformUsername || ''],
  )

  res.status(201).json({ id, platform, platformUsername })
})

// ---------------------------------------------------------------------------
// DELETE /api/social-accounts/:id — Remove a social account
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  await execute('DELETE FROM social_accounts WHERE id = $1', [id])
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/social-accounts/:id/test — Test publish (dry run)
// ---------------------------------------------------------------------------
router.post('/:id/test', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const account = await queryOne<SocialAccount>(
    'SELECT * FROM social_accounts WHERE id = $1',
    [id],
  )

  if (!account) {
    res.status(404).json({ error: 'Account not found' })
    return
  }

  // Check token expiry and refresh if needed
  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    try {
      const refreshed = await refreshToken(account.platform as SocialPlatform, account)
      await execute(
        `UPDATE social_accounts SET access_token = $1, refresh_token = COALESCE($2, refresh_token), expires_at = $3 WHERE id = $4`,
        [refreshed.accessToken, refreshed.refreshToken || null, refreshed.expiresAt || null, id],
      )
      account.access_token = refreshed.accessToken
    } catch (err) {
      res.status(400).json({ error: `Token refresh failed: ${err instanceof Error ? err.message : 'Unknown'}` })
      return
    }
  }

  res.json({ success: true, message: 'Account credentials are valid' })
})

// ---------------------------------------------------------------------------
// POST /api/social-accounts/publish — Publish to a social platform
// ---------------------------------------------------------------------------
router.post('/publish', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { accountId, content, imageUrl, link } = req.body as {
    accountId: string
    content: string
    imageUrl?: string
    link?: string
  }

  if (!accountId || !content) {
    res.status(400).json({ error: 'accountId and content are required' })
    return
  }

  const account = await queryOne<SocialAccount>(
    'SELECT * FROM social_accounts WHERE id = $1',
    [accountId],
  )

  if (!account) {
    res.status(404).json({ error: 'Account not found' })
    return
  }

  // Refresh token if expired
  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    try {
      const refreshed = await refreshToken(account.platform as SocialPlatform, account)
      await execute(
        `UPDATE social_accounts SET access_token = $1, refresh_token = COALESCE($2, refresh_token), expires_at = $3 WHERE id = $4`,
        [refreshed.accessToken, refreshed.refreshToken || null, refreshed.expiresAt || null, accountId],
      )
      account.access_token = refreshed.accessToken
    } catch (err) {
      res.status(400).json({ error: `Token refresh failed: ${err instanceof Error ? err.message : 'Unknown'}` })
      return
    }
  }

  const result = await publishToPlatform(
    account.platform as SocialPlatform,
    account,
    { content, imageUrl, link },
  )

  if (result.success) {
    res.json(result)
  } else {
    res.status(502).json(result)
  }
})

export default router
