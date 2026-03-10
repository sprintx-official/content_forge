import crypto from 'crypto'
import { query, execute } from '../database/connection.js'
import { fetchFeedBatch, type FeedRow } from './fetcher.js'
import { normalizeItem } from './parser.js'
import { startPipelineWorker } from './coverage-pipeline/index.js'
import { startPublishingWorker } from './publishingWorker.js'
import { runDigestCycle } from '../services/email/digestBuilder.js'
import { runBrandQueries } from '../services/brandMonitor.js'
import { detectLanguage } from '../services/languageDetect.js'
import { ensurePartitions, pruneOldPartitions } from '../services/partitionManager.js'

const POLL_INTERVAL = 60 * 1000
const BATCH_SIZE = 20
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour
const DIGEST_INTERVAL = 60 * 60 * 1000  // 1 hour (checks internally if it's time)
const BRAND_MONITOR_INTERVAL = 60 * 60 * 1000 // 1 hour

const TIER_INTERVALS: Record<string, number> = {
  priority: 60_000,    // every tick (60s)
  standard: 180_000,   // every 3 minutes
  low: 600_000,        // every 10 minutes
}

async function pollFeeds() {
  const activeFeeds = await query<FeedRow & { last_fetched_at: string | null }>(
    `SELECT id, url, title, tier, last_fetched_at FROM feeds WHERE status = 'active'`,
  )

  // Filter to feeds whose tier interval has elapsed
  const now = Date.now()
  const feedsDue = activeFeeds.filter(f => {
    const interval = TIER_INTERVALS[f.tier ?? 'standard'] || TIER_INTERVALS.standard
    return !f.last_fetched_at || (now - new Date(f.last_fetched_at).getTime()) >= interval
  })

  if (feedsDue.length === 0) return

  console.log(`[${new Date().toISOString()}] Polling ${feedsDue.length}/${activeFeeds.length} feeds...`)

  const results = await fetchFeedBatch(feedsDue, BATCH_SIZE)

  let totalNew = 0
  let totalErrors = 0

  for (const result of results) {
    if (result.error) {
      totalErrors++
      await execute(
        `UPDATE feeds SET last_fetched_at = NOW(), status = 'error', last_error = $1,
         error_count = error_count + 1 WHERE id = $2`,
        [result.error, result.feed.id],
      )
      continue
    }

    // Update feed status and store WebSub hub URL if detected
    if (result.hubUrl) {
      await execute(
        `UPDATE feeds SET last_fetched_at = NOW(), status = 'active', last_error = NULL,
         error_count = 0, hub_url = $1 WHERE id = $2`,
        [result.hubUrl, result.feed.id],
      )
    } else {
      await execute(
        `UPDATE feeds SET last_fetched_at = NOW(), status = 'active', last_error = NULL,
         error_count = 0 WHERE id = $1`,
        [result.feed.id],
      )
    }

    for (const item of result.items) {
      const normalized = normalizeItem(item)
      if (!normalized) continue

      try {
        const id = crypto.randomUUID()
        const lang = detectLanguage(normalized.title + ' ' + (normalized.description || ''))
        await execute(
          `INSERT INTO articles (id, feed_id, guid, title, url, summary, content, author, published_at, language, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           ON CONFLICT (feed_id, guid) DO NOTHING`,
          [
            id,
            result.feed.id,
            normalized.guid,
            normalized.title,
            normalized.link,
            normalized.description || '',
            normalized.content || '',
            normalized.author || '',
            normalized.published_at,
            lang,
          ],
        )
        totalNew++
      } catch {
        // Duplicate — expected for most articles
      }
    }
  }

  // Update article counts
  await execute(
    `UPDATE feeds SET article_count = (
       SELECT COUNT(*) FROM articles WHERE articles.feed_id = feeds.id
     ) WHERE status = 'active'`,
  )

  if (totalNew > 0 || totalErrors > 0) {
    console.log(`  New articles: ${totalNew}, Errors: ${totalErrors}`)
  }
}

async function cleanupIrrelevantArticles() {
  const result = await execute(
    `DELETE FROM articles WHERE id IN (
       SELECT a.id FROM articles a
       WHERE a.created_at < NOW() - INTERVAL '3 days'
       AND EXISTS (
         SELECT 1 FROM agent_article_screenings s WHERE s.article_id = a.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM agent_article_screenings s
         WHERE s.article_id = a.id AND s.is_relevant = 1
       )
     )`,
  )
}

export async function startWorker() {
  console.log('ContentForge Worker starting...')

  // Start feed polling
  try { await pollFeeds() } catch (e) { console.error('Initial poll failed:', e) }
  setInterval(async () => {
    try { await pollFeeds() } catch (e) { console.error('Poll error:', e) }
  }, POLL_INTERVAL)

  // Start cleanup cycle
  try { await cleanupIrrelevantArticles() } catch (e) { console.error('Initial cleanup failed:', e) }
  setInterval(async () => {
    try { await cleanupIrrelevantArticles() } catch (e) { console.error('Cleanup error:', e) }
  }, CLEANUP_INTERVAL)

  // Start coverage pipeline worker
  await startPipelineWorker()

  // Start social media publishing worker
  await startPublishingWorker()

  // Start email digest cycle
  setInterval(async () => {
    try { await runDigestCycle() } catch (e) { console.error('Digest cycle error:', e) }
  }, DIGEST_INTERVAL)

  // Start brand monitoring
  try { await runBrandQueries() } catch (e) { console.error('Initial brand monitor run failed:', e) }
  setInterval(async () => {
    try { await runBrandQueries() } catch (e) { console.error('Brand monitor error:', e) }
  }, BRAND_MONITOR_INTERVAL)

  // Ensure article partitions exist (non-blocking)
  try { await ensurePartitions(3) } catch (e) { console.error('Partition setup error (non-fatal):', e) }

  // Prune old partitions monthly (run hourly, checks internally)
  setInterval(async () => {
    try { await pruneOldPartitions(12) } catch (e) { console.error('Partition prune error:', e) }
  }, 24 * 60 * 60 * 1000) // daily

  console.log(`Worker running: feeds every ${POLL_INTERVAL / 1000}s, cleanup every ${CLEANUP_INTERVAL / 60000}min, publisher every 30s, brand monitor hourly`)
}
