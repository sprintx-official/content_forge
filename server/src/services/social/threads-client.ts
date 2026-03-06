import type { SocialAccount, SocialClient, PublishRequest, PublishResult } from './types.js'

const THREADS_API = 'https://graph.threads.net/v1.0'

export const threadsClient: SocialClient = {
  async publish(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    try {
      const userId = account.platform_user_id

      // Step 1: Create container
      const containerData: Record<string, string> = {
        text: request.content,
        media_type: request.imageUrl ? 'IMAGE' : 'TEXT',
        access_token: account.access_token,
      }
      if (request.imageUrl) {
        containerData.image_url = request.imageUrl
      }

      const containerRes = await fetch(`${THREADS_API}/${userId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerData),
      })

      if (!containerRes.ok) {
        const err = await containerRes.json().catch(() => ({}))
        return { success: false, error: `Threads container error: ${JSON.stringify(err)}` }
      }

      const { id: containerId } = await containerRes.json() as { id: string }

      // Step 2: Wait then publish
      await new Promise(r => setTimeout(r, 2000))

      const publishRes = await fetch(`${THREADS_API}/${userId}/threads_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: account.access_token,
        }),
      })

      if (!publishRes.ok) {
        const err = await publishRes.json().catch(() => ({}))
        return { success: false, error: `Threads publish error: ${JSON.stringify(err)}` }
      }

      const data = await publishRes.json() as { id: string }
      return { success: true, platformPostId: data.id }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Threads publish failed' }
    }
  },

  async refreshAccessToken(account: SocialAccount) {
    const res = await fetch(
      `${THREADS_API}/refresh_access_token?grant_type=th_refresh_token&access_token=${account.access_token}`,
    )

    if (!res.ok) throw new Error(`Threads token refresh failed (${res.status})`)
    const data = await res.json() as { access_token: string; expires_in: number }

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }
  },
}
