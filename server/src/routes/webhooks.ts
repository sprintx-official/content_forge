import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/webhooks — List all webhooks
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId } = req.query
  let sql = 'SELECT * FROM webhooks'
  const params: unknown[] = []

  if (agentId && typeof agentId === 'string') {
    params.push(agentId)
    sql += ` WHERE agent_id = $${params.length}`
  }
  sql += ' ORDER BY created_at DESC'

  const webhooks = await query<Record<string, unknown>>(sql, params)
  res.json({ webhooks })
})

// ---------------------------------------------------------------------------
// POST /api/webhooks — Create a webhook
// ---------------------------------------------------------------------------
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { agentId, name, url, type, events } = req.body as {
    agentId?: string
    name: string
    url: string
    type?: 'slack' | 'teams' | 'custom'
    events?: string[]
  }

  if (!name || !url) {
    res.status(400).json({ error: 'name and url are required' })
    return
  }

  const id = crypto.randomUUID()
  await execute(
    `INSERT INTO webhooks (id, agent_id, name, url, type, events, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [id, agentId || null, name, url, type || 'custom', JSON.stringify(events || ['pipeline_complete', 'breaking_news'])],
  )

  res.status(201).json({ id })
})

// ---------------------------------------------------------------------------
// DELETE /api/webhooks/:id — Delete a webhook
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  await execute('DELETE FROM webhooks WHERE id = $1', [id])
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/webhooks/:id/test — Test a webhook
// ---------------------------------------------------------------------------
router.post('/:id/test', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const webhook = await queryOne<{ url: string; type: string }>(
    'SELECT url, type FROM webhooks WHERE id = $1', [id],
  )

  if (!webhook) {
    res.status(404).json({ error: 'Webhook not found' })
    return
  }

  try {
    const payload = {
      event: 'test',
      message: 'This is a test notification from ContentForge',
      timestamp: new Date().toISOString(),
    }

    let body: string
    if (webhook.type === 'slack') {
      body = JSON.stringify({ text: `ContentForge Test: ${payload.message}` })
    } else if (webhook.type === 'teams') {
      body = JSON.stringify({ '@type': 'MessageCard', text: payload.message })
    } else {
      body = JSON.stringify(payload)
    }

    const hookRes = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10000),
    })

    res.json({ success: hookRes.ok, status: hookRes.status })
  } catch (err) {
    res.json({ success: false, error: err instanceof Error ? err.message : 'Request failed' })
  }
})

export default router

// Utility: dispatch webhooks for an event
export async function dispatchWebhooks(event: string, agentId: string | null, payload: Record<string, unknown>) {
  let sql = `SELECT * FROM webhooks WHERE is_active = 1`
  const params: unknown[] = []

  if (agentId) {
    params.push(agentId)
    sql += ` AND (agent_id IS NULL OR agent_id = $${params.length})`
  }

  const webhooks = await query<{ url: string; type: string; events: string }>(sql, params)

  for (const webhook of webhooks) {
    try {
      const events: string[] = JSON.parse(webhook.events)
      if (!events.includes(event)) continue

      let body: string
      if (webhook.type === 'slack') {
        body = JSON.stringify({ text: `[${event}] ${JSON.stringify(payload)}` })
      } else if (webhook.type === 'teams') {
        body = JSON.stringify({ '@type': 'MessageCard', text: `[${event}] ${JSON.stringify(payload)}` })
      } else {
        body = JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() })
      }

      fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(10000),
      }).catch(() => {}) // fire-and-forget
    } catch { /* skip malformed webhooks */ }
  }
}
