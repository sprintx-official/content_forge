import type { SocialAccount, SocialClient, PublishRequest, PublishResult } from './types.js'

export const xClient: SocialClient = {
  async publish(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    try {
      // Use X API v2 for posting
      const tweetData: Record<string, unknown> = { text: request.content }

      // Upload media if image provided
      if (request.imageUrl) {
        try {
          const mediaId = await uploadMediaV1(account.access_token, request.imageUrl)
          if (mediaId) {
            tweetData.media = { media_ids: [mediaId] }
          }
        } catch (e) {
          console.warn('[X] Image upload failed, posting text only:', e)
        }
      }

      const res = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${account.access_token}`,
        },
        body: JSON.stringify(tweetData),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: `X API error (${res.status}): ${JSON.stringify(err)}` }
      }

      const data = await res.json() as { data?: { id: string } }
      return { success: true, platformPostId: data.data?.id }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'X publish failed' }
    }
  },

  async refreshAccessToken(account: SocialAccount) {
    const clientId = process.env.X_CLIENT_ID
    const clientSecret = process.env.X_CLIENT_SECRET
    if (!clientId || !clientSecret || !account.refresh_token) {
      throw new Error('X OAuth credentials not configured')
    }

    const res = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
      }),
    })

    if (!res.ok) throw new Error(`X token refresh failed (${res.status})`)
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }
  },
}

async function uploadMediaV1(accessToken: string, imageUrl: string): Promise<string | null> {
  // Fetch the image
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return null
  const buffer = Buffer.from(await imgRes.arrayBuffer())

  // X v1.1 media upload (chunked init → append → finalize)
  const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      command: 'INIT',
      total_bytes: String(buffer.length),
      media_type: 'image/png',
    }),
  })
  if (!initRes.ok) return null
  const initData = await initRes.json() as { media_id_string: string }

  const form = new FormData()
  form.append('command', 'APPEND')
  form.append('media_id', initData.media_id_string)
  form.append('segment_index', '0')
  form.append('media_data', buffer.toString('base64'))

  await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })

  const finalRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      command: 'FINALIZE',
      media_id: initData.media_id_string,
    }),
  })

  if (!finalRes.ok) return null
  const finalData = await finalRes.json() as { media_id_string: string }
  return finalData.media_id_string
}
