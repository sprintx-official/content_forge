import webpush from 'web-push'
import { query, execute } from '../database/connection.js'

let initialized = false

function initWebPush() {
  if (initialized) return
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured — push notifications disabled')
    return
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@contentforge.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  initialized = true
}

export async function sendPushNotification(
  userId: string | null,
  title: string,
  body: string,
  url?: string,
): Promise<void> {
  initWebPush()
  if (!initialized) return

  let sql = 'SELECT id, endpoint, keys_json FROM push_subscriptions'
  const params: unknown[] = []

  if (userId != null) {
    params.push(userId)
    sql += ` WHERE user_id = $${params.length}`
  }

  const subs = await query<{ id: string; endpoint: string; keys_json: string }>(sql, params)

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/',
    timestamp: new Date().toISOString(),
  })

  for (const sub of subs) {
    try {
      const keys = JSON.parse(sub.keys_json) as { p256dh: string; auth: string }
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        },
        payload,
      )
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      // 410 Gone or 404 means subscription is invalid
      if (statusCode === 410 || statusCode === 404) {
        await execute('DELETE FROM push_subscriptions WHERE id = $1', [sub.id])
        console.log(`[Push] Removed invalid subscription ${sub.id}`)
      } else {
        console.error(`[Push] Failed to send to subscription ${sub.id}:`, error)
      }
    }
  }
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}
