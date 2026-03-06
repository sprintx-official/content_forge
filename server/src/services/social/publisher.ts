import { xClient } from './x-client.js'
import { facebookClient } from './facebook-client.js'
import { instagramClient } from './instagram-client.js'
import { linkedinClient } from './linkedin-client.js'
import { threadsClient } from './threads-client.js'
import type { SocialPlatform, SocialClient, SocialAccount, PublishRequest, PublishResult } from './types.js'

const clients: Record<SocialPlatform, SocialClient> = {
  x: xClient,
  facebook: facebookClient,
  instagram: instagramClient,
  linkedin: linkedinClient,
  threads: threadsClient,
}

export function getClient(platform: SocialPlatform): SocialClient {
  return clients[platform]
}

export async function publishToPlatform(
  platform: SocialPlatform,
  account: SocialAccount,
  request: PublishRequest,
): Promise<PublishResult> {
  const client = getClient(platform)
  return client.publish(account, request)
}

export async function refreshToken(
  platform: SocialPlatform,
  account: SocialAccount,
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }> {
  const client = getClient(platform)
  if (!client.refreshAccessToken) {
    throw new Error(`Token refresh not supported for ${platform}`)
  }
  return client.refreshAccessToken(account)
}

export type { SocialPlatform, SocialAccount, PublishRequest, PublishResult }
