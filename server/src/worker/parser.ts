import type Parser from 'rss-parser'

export interface NormalizedArticle {
  title: string
  link: string
  slug: string
  description: string | null
  content: string | null
  author: string | null
  published_at: string | null
  image_url: string | null
  categories: string | null
  guid: string
}

export function normalizeItem(item: Parser.Item): NormalizedArticle | null {
  const title = toStr(item.title)?.trim()
  const link = toStr(item.link)?.trim()

  if (!title || !link) return null

  const raw = item as Record<string, unknown>

  const guid = toStr(item.guid) || toStr(raw.id) || link
  const slug = slugify(title)
  const published_at = parseDate(toStr(item.pubDate) || toStr(item.isoDate) || null)
  const image_url = extractImage(raw)
  const categories = extractCategories(item)

  return {
    title,
    link,
    slug,
    description: stripHtml(toStr(item.contentSnippet) || toStr(item.summary) || null),
    content: toStr(raw['content:encoded']) || toStr(item.content) || null,
    author: toStr(item.creator) || toStr(raw.author) || null,
    published_at,
    image_url,
    categories: categories.length > 0 ? JSON.stringify(categories) : null,
    guid,
  }
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  return null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200)
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

function extractImage(item: Record<string, unknown>): string | null {
  const mediaContent = item.mediaContent as Array<{ $?: { url?: string } }> | undefined
  if (Array.isArray(mediaContent) && mediaContent.length > 0) {
    const url = mediaContent[0]?.$?.url
    if (url) return url
  }

  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url

  const enclosure = item.enclosure as { url?: string; type?: string } | undefined
  if (enclosure?.url && enclosure.type?.startsWith('image')) return enclosure.url

  const content = toStr(item['content:encoded']) || toStr(item.content) || ''
  if (content) {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/)
    if (imgMatch?.[1]) return imgMatch[1]
  }

  return null
}

function extractCategories(item: Parser.Item): string[] {
  if (item.categories && Array.isArray(item.categories)) {
    return item.categories
      .map(c => {
        if (typeof c === 'string') return c.trim()
        if (c && typeof c === 'object') {
          const obj = c as Record<string, unknown>
          if (typeof obj._ === 'string') return obj._.trim()
          if (typeof obj.name === 'string') return obj.name.trim()
        }
        return ''
      })
      .filter(Boolean)
  }
  return []
}

function stripHtml(html: string | null): string | null {
  if (!html) return null
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || null
}

export function titleHash(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const words = normalized.split(' ').filter(w => w.length > 2).slice(0, 8).sort()
  return words.join('_')
}
