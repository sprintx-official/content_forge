import { query, queryOne, execute } from '../database/connection.js'
import { publishToPlatform, refreshToken } from '../services/social/publisher.js'
import type { SocialPlatform, SocialAccount } from '../services/social/types.js'

const PUBLISH_INTERVAL = 30 * 1000 // 30 seconds

async function processPublishingQueue() {
  // Fetch pending items (or scheduled items whose time has arrived)
  const items = await query<{
    id: string
    coverage_post_id: string
    social_post_id: string | null
    social_account_id: string
    platform: string
  }>(
    `SELECT id, coverage_post_id, social_post_id, social_account_id, platform
     FROM publishing_queue
     WHERE status = 'pending'
       AND (scheduled_at IS NULL OR scheduled_at <= NOW())
     ORDER BY created_at ASC
     LIMIT 10`,
  )

  if (items.length === 0) return

  console.log(`[Publisher] Processing ${items.length} queued items...`)

  for (const item of items) {
    try {
      // Get social account
      const account = await queryOne<SocialAccount>(
        `SELECT id, agent_id, platform, platform_user_id, platform_username,
                access_token, refresh_token, expires_at, is_active
         FROM social_accounts WHERE id = $1`,
        [item.social_account_id],
      )

      if (!account || !account.is_active) {
        await execute(
          `UPDATE publishing_queue SET status = 'failed', error = 'Account not found or inactive' WHERE id = $1`,
          [item.id],
        )
        continue
      }

      // Refresh token if expired
      if (account.expires_at && new Date(account.expires_at) < new Date()) {
        try {
          const refreshed = await refreshToken(account.platform as SocialPlatform, account)
          await execute(
            `UPDATE social_accounts SET access_token = $1, refresh_token = COALESCE($2, refresh_token),
             expires_at = $3 WHERE id = $4`,
            [refreshed.accessToken, refreshed.refreshToken ?? null, refreshed.expiresAt ?? null, account.id],
          )
          account.access_token = refreshed.accessToken
          if (refreshed.refreshToken) account.refresh_token = refreshed.refreshToken
        } catch (err) {
          await execute(
            `UPDATE publishing_queue SET status = 'failed', error = $1 WHERE id = $2`,
            [`Token refresh failed: ${err instanceof Error ? err.message : 'Unknown error'}`, item.id],
          )
          continue
        }
      }

      // Get social post content
      let content = ''
      if (item.social_post_id) {
        const socialPost = await queryOne<{ content: string; edited_content: string | null }>(
          `SELECT content, edited_content FROM coverage_social_posts WHERE id = $1`,
          [item.social_post_id],
        )
        content = socialPost?.edited_content || socialPost?.content || ''
      }

      if (!content) {
        await execute(
          `UPDATE publishing_queue SET status = 'failed', error = 'No content to publish' WHERE id = $1`,
          [item.id],
        )
        continue
      }

      // Get image URL — pick format based on platform
      const post = await queryOne<{ image_square: string | null; image_landscape: string | null }>(
        `SELECT image_square, image_landscape FROM coverage_posts WHERE id = $1`,
        [item.coverage_post_id],
      )

      const platform = item.platform as SocialPlatform
      const useSquare = platform === 'instagram' || platform === 'facebook'
      const imageUrl = useSquare
        ? (post?.image_square || post?.image_landscape || undefined)
        : (post?.image_landscape || post?.image_square || undefined)

      // Publish
      const result = await publishToPlatform(platform, account, {
        content,
        imageUrl,
      })

      if (result.success) {
        await execute(
          `UPDATE publishing_queue SET status = 'published', published_at = NOW(),
           error = NULL WHERE id = $1`,
          [item.id],
        )
        console.log(`  [Publisher] Published to ${platform}: ${result.platformPostId || 'OK'}`)
      } else {
        await execute(
          `UPDATE publishing_queue SET status = 'failed', error = $1 WHERE id = $2`,
          [result.error || 'Unknown publish error', item.id],
        )
        console.warn(`  [Publisher] Failed ${platform}: ${result.error}`)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      await execute(
        `UPDATE publishing_queue SET status = 'failed', error = $1 WHERE id = $2`,
        [errMsg, item.id],
      )
      console.error(`  [Publisher] Error processing item ${item.id}:`, errMsg)
    }
  }
}

export async function startPublishingWorker() {
  console.log('Publishing Worker starting...')

  setInterval(async () => {
    try {
      await processPublishingQueue()
    } catch (err) {
      console.error('[Publisher] Worker error:', err)
    }
  }, PUBLISH_INTERVAL)

  console.log(`Publishing Worker running every ${PUBLISH_INTERVAL / 1000}s`)
}
