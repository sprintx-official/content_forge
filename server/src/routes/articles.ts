import { Router, type Response } from 'express'
import { query, queryOne } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/articles — List articles with filters
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { feedId, agentId, search, relevant } = req.query
  const limit = Math.max(0, Math.min(parseInt(String(req.query.limit || '50'), 10), 200))
  const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10))

  let sql = `SELECT a.*, f.title as feed_title FROM articles a JOIN feeds f ON f.id = a.feed_id`
  const params: unknown[] = []
  const conditions: string[] = []

  if (feedId && typeof feedId === 'string') {
    params.push(feedId)
    conditions.push(`a.feed_id = $${params.length}`)
  }

  if (agentId && typeof agentId === 'string') {
    sql = `SELECT a.*, f.title as feed_title, aas.is_relevant
           FROM articles a
           JOIN feeds f ON f.id = a.feed_id
           JOIN agent_feeds af ON af.feed_id = a.feed_id AND af.agent_id = $${params.length + 1}`
    params.push(agentId)

    if (relevant === 'true') {
      sql += ` JOIN agent_article_screenings aas ON aas.article_id = a.id AND aas.agent_id = $${params.length}`
      conditions.push('aas.is_relevant = 1')
    } else {
      sql += ` LEFT JOIN agent_article_screenings aas ON aas.article_id = a.id AND aas.agent_id = $${params.length}`
    }
  }

  if (search && typeof search === 'string') {
    params.push(`%${search}%`)
    conditions.push(`(a.title ILIKE $${params.length} OR a.summary ILIKE $${params.length})`)
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY a.created_at DESC'
  params.push(limit)
  sql += ` LIMIT $${params.length}`
  params.push(offset)
  sql += ` OFFSET $${params.length}`

  const articles = await query<Record<string, unknown>>(sql, params)
  res.json({ articles })
})

// ---------------------------------------------------------------------------
// GET /api/articles/feed-presets — Get preset feed database
// ---------------------------------------------------------------------------
router.get('/feed-presets', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const RSS_DATABASE: Record<string, Array<{ name: string; url: string }>> = {
    'World News': [
      { name: 'Reuters - World', url: 'https://feeds.reuters.com/Reuters/worldNews' },
      { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'AP News', url: 'https://rsshub.app/apnews/topics/world-news' },
      { name: 'France 24', url: 'https://www.france24.com/en/rss' },
    ],
    Pakistan: [
      { name: 'Dawn News', url: 'https://www.dawn.com/feeds/home' },
      { name: 'The News International', url: 'https://www.thenews.com.pk/rss/1/1' },
      { name: 'Geo News', url: 'https://www.geo.tv/rss/1/0' },
      { name: 'Express Tribune', url: 'https://tribune.com.pk/feed' },
      { name: 'ARY News', url: 'https://arynews.tv/feed/' },
    ],
    'USA Politics': [
      { name: 'Reuters - US', url: 'https://feeds.reuters.com/Reuters/domesticNews' },
      { name: 'AP News - Politics', url: 'https://rsshub.app/apnews/topics/politics' },
      { name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml' },
      { name: 'The Hill', url: 'https://thehill.com/feed/' },
      { name: 'Politico', url: 'https://www.politico.com/rss/politics08.xml' },
    ],
    'Middle East': [
      { name: 'Al Jazeera - Middle East', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'Middle East Eye', url: 'https://www.middleeasteye.net/rss' },
      { name: 'The National', url: 'https://www.thenationalnews.com/rss' },
      { name: 'Al-Monitor', url: 'https://www.al-monitor.com/rss' },
      { name: 'Arab News', url: 'https://www.arabnews.com/rss.xml' },
    ],
    'South Asia': [
      { name: 'The Hindu', url: 'https://www.thehindu.com/news/feeder/default.rss' },
      { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
      { name: 'Dhaka Tribune', url: 'https://www.dhakatribune.com/feed' },
      { name: 'Kathmandu Post', url: 'https://kathmandupost.com/rss' },
    ],
    Technology: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
      { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
    ],
    'AI & Machine Learning': [
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
      { name: 'The Decoder', url: 'https://the-decoder.com/feed/' },
      { name: 'AI News', url: 'https://www.artificialintelligence-news.com/feed/' },
      { name: 'Google AI Blog', url: 'https://blog.research.google/feeds/posts/default?alt=rss' },
    ],
    'Business & Economy': [
      { name: 'Reuters - Business', url: 'https://feeds.reuters.com/reuters/businessNews' },
      { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss' },
      { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
    ],
    Sports: [
      { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news' },
      { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
      { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040' },
    ],
    'Science & Health': [
      { name: 'Nature', url: 'https://www.nature.com/nature.rss' },
      { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml' },
      { name: 'STAT News', url: 'https://www.statnews.com/feed/' },
    ],
    'Climate & Environment': [
      { name: 'Carbon Brief', url: 'https://www.carbonbrief.org/feed/' },
      { name: 'Guardian Environment', url: 'https://www.theguardian.com/environment/rss' },
    ],
    Entertainment: [
      { name: 'Variety', url: 'https://variety.com/feed/' },
      { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/' },
      { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/' },
    ],
    'Cryptocurrency & Finance': [
      { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
      { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
    ],
    'Military & Defense': [
      { name: 'Defense One', url: 'https://www.defenseone.com/rss/' },
      { name: 'Defense News', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/' },
      { name: 'War on the Rocks', url: 'https://warontherocks.com/feed/' },
    ],
  }

  res.json({ presets: RSS_DATABASE })
})

export default router
