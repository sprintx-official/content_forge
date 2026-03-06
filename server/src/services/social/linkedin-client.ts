import type { SocialAccount, SocialClient, PublishRequest, PublishResult } from './types.js'

export const linkedinClient: SocialClient = {
  async publish(account: SocialAccount, request: PublishRequest): Promise<PublishResult> {
    try {
      const orgUrn = `urn:li:organization:${account.platform_user_id}`
      const postData: Record<string, unknown> = {
        author: orgUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: request.content },
            shareMediaCategory: 'NONE' as string,
            media: [] as unknown[],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }

      const shareContent = (postData.specificContent as Record<string, unknown>)['com.linkedin.ugc.ShareContent'] as Record<string, unknown>

      // Upload image if provided
      if (request.imageUrl) {
        const assetUrn = await uploadLinkedInImage(account.access_token, orgUrn, request.imageUrl)
        if (assetUrn) {
          shareContent.shareMediaCategory = 'IMAGE'
          shareContent.media = [{
            status: 'READY',
            media: assetUrn,
          }]
        }
      } else if (request.link) {
        shareContent.shareMediaCategory = 'ARTICLE'
        shareContent.media = [{
          status: 'READY',
          originalUrl: request.link,
        }]
      }

      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${account.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postData),
      })

      if (!res.ok) {
        const err = await res.text()
        return { success: false, error: `LinkedIn API error (${res.status}): ${err}` }
      }

      const postId = res.headers.get('x-restli-id') || ''
      return { success: true, platformPostId: postId }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'LinkedIn publish failed' }
    }
  },

  async refreshAccessToken(account: SocialAccount) {
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    if (!clientId || !clientSecret || !account.refresh_token) {
      throw new Error('LinkedIn OAuth credentials not configured')
    }

    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!res.ok) throw new Error(`LinkedIn token refresh failed (${res.status})`)
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }
  },
}

async function uploadLinkedInImage(accessToken: string, ownerUrn: string, imageUrl: string): Promise<string | null> {
  try {
    // Step 1: Register upload
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: ownerUrn,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }],
        },
      }),
    })

    if (!registerRes.ok) return null
    const registerData = await registerRes.json() as {
      value: {
        uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: string } }
        asset: string
      }
    }

    const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl
    const assetUrn = registerData.value.asset

    // Step 2: Upload image
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return null
    const buffer = Buffer.from(await imgRes.arrayBuffer())

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'image/png',
      },
      body: buffer,
    })

    return uploadRes.ok ? assetUrn : null
  } catch {
    return null
  }
}
