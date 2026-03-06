import type { SocialAccount, SocialClient, PublishRequest, PublishResult } from './types.js'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

export const facebookClient: SocialClient = {
  async publish(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    try {
      const pageId = account.platform_user_id
      let endpoint: string
      const params: Record<string, string> = { access_token: account.access_token }

      if (request.imageUrl && !request.link) {
        // Photo post
        endpoint = `${GRAPH_API}/${pageId}/photos`
        params.url = request.imageUrl
        params.caption = request.content
      } else {
        // Feed post (text or link)
        endpoint = `${GRAPH_API}/${pageId}/feed`
        params.message = request.content
        if (request.link) params.link = request.link
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: `Facebook API error: ${JSON.stringify(err)}` }
      }

      const data = await res.json() as { id?: string; post_id?: string }
      return { success: true, platformPostId: data.post_id || data.id }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Facebook publish failed' }
    }
  },

  async refreshAccessToken(account: SocialAccount) {
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    if (!appId || !appSecret) throw new Error('Facebook app credentials not configured')

    const res = await fetch(
      `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${account.access_token}`,
    )

    if (!res.ok) throw new Error(`Facebook token refresh failed (${res.status})`)
    const data = await res.json() as { access_token: string; expires_in?: number }

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
    }
  },
}
