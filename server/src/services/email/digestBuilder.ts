import { query, execute } from '../../database/connection.js'
import { digestEmailHtml, breakingNewsEmailHtml, type DigestPost } from './templates.js'
import { sendEmail } from './transporter.js'

export async function buildAndSendDigest(
  userId: string,
  userEmail: string,
  frequency: 'daily' | 'weekly',
): Promise<void> {
  const interval = frequency === 'daily' ? '1 day' : '7 days'

  const posts = await query<DigestPost>(
    `SELECT
      cp.id,
      cp.title,
      cp.summary,
      cp.category,
      cp.urgency,
      cp.confidence,
      cp.created_at,
      COALESCE(a.name, 'Unknown') as agent_name
    FROM coverage_posts cp
    LEFT JOIN agents a ON a.id = cp.agent_id
    WHERE cp.created_at > NOW() - $1::interval
      AND cp.status = 'published'
    ORDER BY
      CASE cp.urgency
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'developing' THEN 2
        ELSE 3
      END,
      cp.created_at DESC
    LIMIT 50`,
    [interval],
  )

  if (posts.length === 0) return

  const period = frequency === 'daily' ? 'Daily' : 'Weekly'
  const html = digestEmailHtml(posts, 'All Agents', period)

  await sendEmail({
    to: userEmail,
    subject: `${period} Digest — ContentForge`,
    html,
  })
}

export async function sendBreakingNewsAlert(post: DigestPost): Promise<void> {
  const prefs = await query<{ user_id: string; email: string }>(
    `SELECT ep.user_id, u.email
     FROM email_preferences ep
     JOIN users u ON u.id = ep.user_id
     WHERE ep.breaking_news = 1`,
  )

  if (prefs.length === 0) return

  const html = breakingNewsEmailHtml(post)

  for (const pref of prefs) {
    try {
      await sendEmail({
        to: pref.email,
        subject: `BREAKING: ${post.title} — ContentForge`,
        html,
      })
    } catch (err) {
      console.error(`[Email] Failed to send breaking alert to user ${pref.user_id}:`, err)
    }
  }
}

export async function runDigestCycle(): Promise<void> {
  const now = new Date()
  const hour = now.getUTCHours()

  // Send daily digests at 8am UTC
  if (hour === 8) {
    const dailyUsers = await query<{ user_id: string; email: string }>(
      `SELECT ep.user_id, u.email
       FROM email_preferences ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.digest_frequency = 'daily'`,
    )
    for (const u of dailyUsers) {
      try {
        await buildAndSendDigest(u.user_id, u.email, 'daily')
      } catch (err) {
        console.error(`[Email] Daily digest failed for ${u.user_id}:`, err)
      }
    }
  }

  // Send weekly digests on Monday at 8am UTC
  if (hour === 8 && now.getUTCDay() === 1) {
    const weeklyUsers = await query<{ user_id: string; email: string }>(
      `SELECT ep.user_id, u.email
       FROM email_preferences ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.digest_frequency = 'weekly'`,
    )
    for (const u of weeklyUsers) {
      try {
        await buildAndSendDigest(u.user_id, u.email, 'weekly')
      } catch (err) {
        console.error(`[Email] Weekly digest failed for ${u.user_id}:`, err)
      }
    }
  }
}
