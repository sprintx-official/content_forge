import crypto from 'crypto'
import type { SocialAccount, SocialClient, PublishRequest, PublishResult } from './types.js'

interface XOAuth1Credentials {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

function parseCredentials(account: SocialAccount): XOAuth1Credentials | null {
  try {
    const parsed = JSON.parse(account.access_token)
    if (parsed.apiKey && parsed.apiSecret && parsed.accessToken && parsed.accessTokenSecret) {
      return parsed as XOAuth1Credentials
    }
  } catch { /* not JSON — legacy Bearer token */ }
  return null
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function generateOAuth1Header(
  method: string,
  url: string,
  creds: XOAuth1Credentials,
  extraParams: Record<string, string> = {},
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  }

  // Combine oauth params + extra params for signature base
  const allParams = { ...oauthParams, ...extraParams }
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessTokenSecret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  oauthParams.oauth_signature = signature

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

export const xClient: SocialClient = {
  async publish(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    try {
      const creds = parseCredentials(account)

      const tweetData: Record<string, unknown> = { text: request.content }

      // Upload media if image provided
      if (request.imageUrl) {
        try {
          const mediaId = creds
            ? await uploadMediaV1OAuth1(creds, request.imageUrl)
            : await uploadMediaV1Bearer(account.access_token, request.imageUrl)
          if (mediaId) {
            tweetData.media = { media_ids: [mediaId] }
          }
        } catch (e) {
          console.warn('[X] Image upload failed, posting text only:', e)
        }
      }

      let res: Response
      if (creds) {
        // OAuth 1.0a — sign the request
        const authHeader = generateOAuth1Header('POST', 'https://api.x.com/2/tweets', creds)
        res = await fetch('https://api.x.com/2/tweets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(tweetData),
        })
      } else {
        // Legacy Bearer token (OAuth 2.0)
        res = await fetch('https://api.x.com/2/tweets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${account.access_token}`,
          },
          body: JSON.stringify(tweetData),
        })
      }

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
    // OAuth 1.0a tokens don't expire, so no refresh needed
    const creds = parseCredentials(account)
    if (creds) {
      return { accessToken: account.access_token }
    }

    // OAuth 2.0 refresh flow
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

async function uploadMediaV1OAuth1(creds: XOAuth1Credentials, imageUrl: string): Promise<string | null> {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return null
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const mediaData = buffer.toString('base64')

  // Simple media upload (non-chunked, for images < 5MB)
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'
  const params = { media_data: mediaData }
  const authHeader = generateOAuth1Header('POST', uploadUrl, creds, params)

  const body = new URLSearchParams(params)
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) return null
  const data = await res.json() as { media_id_string: string }
  return data.media_id_string
}

async function uploadMediaV1Bearer(accessToken: string, imageUrl: string): Promise<string | null> {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return null
  const buffer = Buffer.from(await imgRes.arrayBuffer())

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
