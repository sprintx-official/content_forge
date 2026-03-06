export type SocialPlatform = 'x' | 'facebook' | 'linkedin' | 'instagram' | 'threads'

export interface SocialAccount {
  id: string
  agent_id: string
  platform: SocialPlatform
  platform_user_id: string
  platform_username: string
  access_token: string
  refresh_token: string
  expires_at: string | null
  is_active: number
}

export interface PublishRequest {
  content: string
  imageUrl?: string
  link?: string
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  error?: string
}

export interface SocialClient {
  publish(account: SocialAccount, request: PublishRequest): Promise<PublishResult>
  refreshAccessToken?(account: SocialAccount): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: string
  }>
}
