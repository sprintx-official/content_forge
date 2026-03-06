import type { SocialAccount, SocialClient, PublishRequest, PublishResult } from './types.js'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

export const instagramClient: SocialClient = {
  async publish(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    try {
      if (!request.imageUrl) {
        return { success: false, error: 'Instagram requires an image' }
      }

      const igUserId = account.platform_user_id

      // Step 1: Create media container
      const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: request.imageUrl,
          caption: request.content,
          access_token: account.access_token,
        }),
      })

      if (!containerRes.ok) {
        const err = await containerRes.json().catch(() => ({}))
        return { success: false, error: `Instagram container error: ${JSON.stringify(err)}` }
      }

      const { id: containerId } = await containerRes.json() as { id: string }

      // Step 2: Poll until FINISHED (max 10 attempts, 2s apart)
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const statusRes = await fetch(
          `${GRAPH_API}/${containerId}?fields=status_code&access_token=${account.access_token}`,
        )
        const statusData = await statusRes.json() as { status_code?: string }
        if (statusData.status_code === 'FINISHED') break
        if (statusData.status_code === 'ERROR') {
          return { success: false, error: 'Instagram media processing failed' }
        }
      }

      // Step 3: Publish
      const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: account.access_token,
        }),
      })

      if (!publishRes.ok) {
        const err = await publishRes.json().catch(() => ({}))
        return { success: false, error: `Instagram publish error: ${JSON.stringify(err)}` }
      }

      const data = await publishRes.json() as { id: string }
      return { success: true, platformPostId: data.id }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Instagram publish failed' }
    }
  },
  // Instagram uses Facebook's token refresh
}
