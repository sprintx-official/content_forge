import Parser from 'rss-parser'

export interface FeedRow {
  id: string
  url: string
  title: string
  tier: string
}

export interface FetchResult {
  feed: FeedRow
  items: Parser.Item[]
  error?: string
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'ContentForge/1.0 (RSS Aggregator)',
    Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
    ],
  },
})

export async function fetchFeedBatch(feeds: FeedRow[], batchSize = 20): Promise<FetchResult[]> {
  const results: FetchResult[] = []

  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(feed => fetchSingleFeed(feed)),
    )

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          feed: batch[j],
          items: [],
          error: result.reason?.message || 'Unknown error',
        })
      }
    }

    if (i + batchSize < feeds.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}

async function fetchSingleFeed(feed: FeedRow): Promise<FetchResult> {
  try {
    const parsed = await parser.parseURL(feed.url)
    return { feed, items: parsed.items || [] }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { feed, items: [], error: message }
  }
}
