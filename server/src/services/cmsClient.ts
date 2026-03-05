import { queryOne } from '../database/connection.js'

/** Strip trailing /api/v1 so callers can append /api/v1/... */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
}

export interface CmsPublishRequest {
  title: string
  slug: string
  content: string
  categorySlug: string
  status?: 'draft' | 'published'
  excerpt?: string
  tags?: string[]
  featuredImageUrl?: string
  featuredImageAlt?: string
  featuredImageCaption?: string
  featuredImageCredit?: string
  seoTitle?: string
  seoDescription?: string
  seoOgImage?: string
  isBreaking?: boolean
  readTime?: number
  externalId?: string
}

export interface CmsPublishResult {
  success: boolean
  articleId?: string
  slug?: string
  url?: string
  error?: string
  isDuplicate?: boolean
}

export interface CmsCategory {
  id: string
  slug: string
  name: string
}

// Category mapping: free-form → CMS slugs
const CATEGORY_MAP: Record<string, string> = {
  'ai geopolitics': 'ai', 'ai policy': 'ai', 'ai safety': 'ai', 'ai governance': 'ai',
  'defense ai': 'ai', 'military ai': 'ai', semiconductor: 'ai', 'chip controls': 'ai',
  'artificial intelligence': 'ai', ai: 'ai',
  geopolitics: 'world', politics: 'politics', business: 'business',
  technology: 'technology', tech: 'technology', sports: 'sports',
  cricket: 'sports', football: 'sports', soccer: 'sports',
  health: 'health', science: 'science', entertainment: 'entertainment',
  world: 'world', international: 'world', economy: 'business',
  finance: 'business', opinion: 'opinion',
}

export function mapCategoryToCmsSlug(category: string | null, defaultSlug: string): string {
  if (!category) return defaultSlug
  const lower = category.toLowerCase().trim()
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower]
  const primary = lower.split('|')[0].trim()
  if (CATEGORY_MAP[primary]) return CATEGORY_MAP[primary]
  for (const seg of lower.split('|').map(s => s.trim())) {
    if (CATEGORY_MAP[seg]) return CATEGORY_MAP[seg]
  }
  const sortedKeys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) return CATEGORY_MAP[key]
  }
  return defaultSlug
}

/** Strip citation markers like [1], [2] */
export function stripCitations(text: string): string {
  return text.replace(/\s*\[\d+(?:\s*,\s*\d+)*\]\.?/g, '')
}

function cleanAiArtifacts(text: string): string {
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/__(.+?)__/g, '$1')
  text = text.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '$1')
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/^[-*•]\s+/gm, '')
  text = text.replace(/\s\*\s/g, ' ')
  text = text.replace(/\s*—\s*/g, ', ')
  text = text.replace(/,\s*,/g, ',')
  return text
}

function isDirectQuote(text: string): boolean {
  const trimmed = text.trim()
  if (/^['"\u2018\u2019\u201C\u201D]/.test(trimmed) && /['"\u2018\u2019\u201C\u201D][.,]?$/.test(trimmed)) return true
  if (/\b(said|told|stated|added|explained|noted)\b/i.test(trimmed)) {
    if ((trimmed.match(/['"]/g) || []).length >= 2) return true
  }
  return false
}

function boldKeyEntities(html: string): string {
  const bolded = new Set<string>()
  return html.replace(/(?<=>|^)([^<]*?)(?=<|$)/g, (_, segment: string) => {
    return segment.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g, (match: string) => {
      if (bolded.has(match) || match.length < 5) return match
      const idx = segment.indexOf(match)
      if (idx === 0 || (idx >= 2 && segment[idx - 2] === '.')) return match
      bolded.add(match)
      return `<strong>${match}</strong>`
    })
  })
}

export function plainTextToHtml(text: string): string {
  if (!text) return ''
  text = stripCitations(text)
  text = cleanAiArtifacts(text)
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return ''
  const html: string[] = []
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].replace(/\n/g, '<br />')
    if (i === 0) {
      html.push(`<p><strong>${p}</strong></p>`)
    } else if (isDirectQuote(paragraphs[i])) {
      html.push(`<blockquote><p>${p}</p></blockquote>`)
    } else {
      html.push(`<p>${p}</p>`)
    }
    if (i > 0 && i % 4 === 0 && i < paragraphs.length - 1) {
      html.push('<hr />')
    }
  }
  let result = html.join('\n')
  result = boldKeyEntities(result)
  return result
}

/** Generate tags from category and key facts */
export function generateTags(category: string | null, keyFacts: string | null): string[] {
  const tags = new Set<string>()
  if (category) {
    for (const segment of category.split('|')) {
      const tag = segment.trim()
      if (tag && tag.length <= 30) tags.add(tag)
    }
  }
  if (keyFacts) {
    try {
      const facts: string[] = typeof keyFacts === 'string' ? JSON.parse(keyFacts) : keyFacts
      for (const fact of facts) {
        const matches = fact.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g)
        if (matches) for (const m of matches) if (m.length >= 3 && m.length <= 30) tags.add(m)
        const acronyms = fact.match(/\b[A-Z]{2,6}\b/g)
        if (acronyms) for (const a of acronyms) if (a !== 'THE' && a !== 'AND' && a !== 'FOR') tags.add(a)
      }
    } catch { /* skip */ }
  }
  return [...tags].slice(0, 10)
}

/** Get an agent setting by key */
export async function getAgentSetting(agentId: string, key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>(
    'SELECT value FROM agent_settings WHERE agent_id = $1 AND key = $2',
    [agentId, key],
  )
  return row?.value ?? null
}

/** Set an agent setting (upsert) */
export async function setAgentSetting(agentId: string, key: string, value: string): Promise<void> {
  const { execute } = await import('../database/connection.js')
  await execute(
    `INSERT INTO agent_settings (id, agent_id, key, value)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (agent_id, key) DO UPDATE SET value = $4`,
    [crypto.randomUUID(), agentId, key, value],
  )
}

/** Publish a post to the CMS */
export async function publishToCms(
  agentId: string,
  request: CmsPublishRequest,
): Promise<CmsPublishResult> {
  const rawUrl = (await getAgentSetting(agentId, 'cms_api_url'))?.trim()
  const apiKey = (await getAgentSetting(agentId, 'cms_api_key'))?.trim()
  if (!rawUrl || !apiKey) {
    return { success: false, error: 'CMS API URL or API key not configured' }
  }
  const apiUrl = normalizeBaseUrl(rawUrl)
  try {
    const res = await fetch(`${apiUrl}/api/v1/external/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(request),
    })
    const data = await res.json()
    if (res.status === 200 || res.status === 201) {
      return { success: true, articleId: data.id, slug: data.slug, url: data.url }
    }
    return { success: false, error: data.error || `CMS returned ${res.status}` }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to connect to CMS' }
  }
}

/** Link published article to a developing story in CMS */
export async function linkArticleToDevelopingStory(
  agentId: string,
  storyId: string,
  articleSlug: string,
  title: string,
  content: string,
  urgency: string,
  imageUrl?: string,
): Promise<boolean> {
  const rawUrl = (await getAgentSetting(agentId, 'cms_api_url'))?.trim()
  const apiKey = (await getAgentSetting(agentId, 'cms_api_key'))?.trim()
  if (!rawUrl || !apiKey) return false
  const apiUrl = normalizeBaseUrl(rawUrl)
  const updateType = urgency === 'critical' ? 'breaking' : urgency === 'high' ? 'developing' : 'update'
  const updateContent = content.slice(0, 300)
  try {
    const res = await fetch(`${apiUrl}/api/v1/external/developing-stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        storyId,
        articleSlug,
        updateTitle: title,
        updateContent,
        updateContentHtml: `<p>${updateContent}</p>`,
        updateType,
        ...(imageUrl && { updateImageUrl: imageUrl }),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Test CMS connection */
export async function testCmsConnection(
  rawUrl: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  const apiUrl = normalizeBaseUrl(rawUrl)
  try {
    const res = await fetch(`${apiUrl}/api/v1/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) return { success: true }
    return { success: false, error: `CMS returned ${res.status}` }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to connect' }
  }
}

/** Fetch available categories from CMS */
export async function fetchCmsCategories(rawUrl: string): Promise<CmsCategory[]> {
  const apiUrl = normalizeBaseUrl(rawUrl)
  try {
    const res = await fetch(`${apiUrl}/api/v1/categories`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.categories || data || []).map((c: { id: string; slug: string; name: string }) => ({
      id: c.id, slug: c.slug, name: c.name,
    }))
  } catch {
    return []
  }
}
