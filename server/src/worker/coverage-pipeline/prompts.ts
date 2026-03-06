import { queryOne, query } from '../../database/connection.js'

// Default model assignments — agents can override per-step via agent_settings
const DEFAULT_MODELS: Record<string, string> = {
  model_filter: 'gpt-4.1-nano',
  model_cluster: 'gemini-2.5-flash',
  model_dedup: 'gpt-4.1-nano',
  model_research: 'gemini-2.5-flash',
  model_generate: 'gemini-2.5-pro',
  model_image_generate: 'gemini-2.5-flash-image',
}

export const SETTING_DEFAULTS: Record<string, string> = {
  prompt_image_generate: 'Generate a photojournalistic image suitable for a news article. No text overlays.',
}

export async function getAgentModel(agentId: string, settingKey: string): Promise<string> {
  const row = await queryOne<{ value: string }>(
    'SELECT value FROM agent_settings WHERE agent_id = $1 AND key = $2',
    [agentId, settingKey],
  )
  return row?.value || DEFAULT_MODELS[settingKey] || 'gemini-2.5-flash'
}

async function getAgentContext(agentId: string): Promise<{ name: string; systemPrompt: string }> {
  const agent = await queryOne<{ name: string; system_prompt: string }>(
    'SELECT name, system_prompt FROM agents WHERE id = $1',
    [agentId],
  )
  return {
    name: agent?.name || 'News Agent',
    systemPrompt: agent?.system_prompt || '',
  }
}

async function getAgentGuideline(agentId: string, type: string): Promise<string> {
  const row = await queryOne<{ content: string }>(
    'SELECT content FROM agent_guidelines WHERE agent_id = $1 AND guideline_type = $2',
    [agentId, type],
  )
  return row?.content || ''
}

// ---------------------------------------------------------------------------
// Filter prompt
// ---------------------------------------------------------------------------
export async function buildFilterPrompt(
  articles: { id: string; title: string; description: string | null }[],
  agentId: string,
): Promise<string> {
  const { name, systemPrompt } = await getAgentContext(agentId)
  const guideline = await getAgentGuideline(agentId, 'filter')

  const articleList = articles
    .map((a, i) => `[${a.id}] ${a.title}${a.description ? ` — ${a.description.slice(0, 150)}` : ''}`)
    .join('\n')

  return `You are an editorial filter for "${name}".

${systemPrompt ? `AGENT FOCUS:\n${systemPrompt}\n` : ''}${guideline ? `FILTER GUIDELINES:\n${guideline}\n` : ''}
TASK: Review the following articles and return ONLY a JSON array of IDs that are relevant to this agent's focus. Be strict — only pass stories that are highly relevant.

Return format: [id1, id2, ...]

ARTICLES:
${articleList}

Return ONLY the JSON array of relevant article IDs. No explanation needed.`
}

// ---------------------------------------------------------------------------
// Cluster prompt
// ---------------------------------------------------------------------------
export async function buildClusterPrompt(
  articles: { id: string; title: string; description: string | null; language: string | null }[],
  agentId: string,
): Promise<string> {
  const { name } = await getAgentContext(agentId)
  const guideline = await getAgentGuideline(agentId, 'narrative')

  const articleList = articles
    .map((a, i) => `[${i + 1}] ${a.title}${a.description ? ` — ${a.description.slice(0, 120)}` : ''}${a.language && a.language !== 'en' ? ` [${a.language}]` : ''}`)
    .join('\n')

  return `You are a news desk editor for "${name}". Group the following articles into topic clusters.
${guideline ? `\nNARRATIVE GUIDELINES:\n${guideline}\n` : ''}
ARTICLES (numbered by index):
${articleList}

For each cluster, return JSON:
[{
  "fingerprint": "Short descriptive title for this story cluster",
  "key_facts": ["fact1", "fact2", ...],
  "story_stage": "breaking|developing|ongoing|resolved",
  "article_indices": [1, 3, 5],
  "urgency": "critical|high|developing|routine"
}]

Rules:
- Each article should appear in at most ONE cluster
- Minimum 2 articles per cluster (single articles are not clusters)
- Fingerprint should be a neutral, descriptive headline
- Urgency: critical = active crisis/breaking, high = significant development, developing = evolving story, routine = standard coverage
- Return ONLY the JSON array`
}

// ---------------------------------------------------------------------------
// Dedup prompt
// ---------------------------------------------------------------------------
export async function buildDedupPrompt(
  newFingerprint: string,
  newKeyFacts: string[],
  existingFingerprint: string,
  existingKeyFacts: string[],
  _agentId: string,
): Promise<string> {
  return `Compare these two news stories and determine if the NEW story is a genuinely new development or just a duplicate of the EXISTING story.

EXISTING STORY:
Title: ${existingFingerprint}
Key facts: ${existingKeyFacts.join('; ')}

NEW STORY:
Title: ${newFingerprint}
Key facts: ${newKeyFacts.join('; ')}

Return JSON:
{"is_new_development": true/false, "reason": "brief explanation"}

Rules:
- If the NEW story has meaningfully new information, return is_new_development: true
- If it's essentially the same story with no new details, return is_new_development: false
- Minor rephrasing without new facts = NOT a new development`
}

// ---------------------------------------------------------------------------
// Research prompt
// ---------------------------------------------------------------------------
export async function buildResearchPrompt(
  cluster: { fingerprint: string; key_facts: string[]; article_ids: string[] },
  agentId: string,
): Promise<string> {
  return `You are a research assistant. Research the following news topic using Google Search to gather additional context, verify key facts, and identify SEO opportunities.

TOPIC: ${cluster.fingerprint}
KEY FACTS: ${cluster.key_facts.join('; ')}
SOURCE ARTICLE COUNT: ${cluster.article_ids.length}

Return JSON:
{
  "topic": {
    "context_summary": "2-3 paragraph background on this topic",
    "entities": {
      "people": [{"name": "...", "role": "...", "relevance": "..."}],
      "organizations": [{"name": "...", "type": "...", "relevance": "..."}],
      "locations": [{"name": "...", "significance": "..."}]
    }
  },
  "seo": {
    "primary_keywords": ["keyword1", "keyword2"],
    "secondary_keywords": ["keyword3"],
    "long_tail_keywords": ["long tail phrase"],
    "content_gaps": ["topics competitors are missing"]
  },
  "platforms": {
    "x": {"hashtags": ["#tag1"], "trending_keywords": ["keyword"], "format_recommendation": "short and urgent"},
    "linkedin": {"hashtags": ["#tag1"], "trending_keywords": [], "format_recommendation": "professional analysis"},
    "facebook": {"hashtags": [], "trending_keywords": [], "format_recommendation": "conversational"},
    "instagram": {"hashtags": ["#tag1", "#tag2"], "trending_keywords": [], "format_recommendation": "visual story"},
    "threads": {"hashtags": [], "trending_keywords": [], "format_recommendation": "casual and engaging"}
  },
  "research_timestamp": "${new Date().toISOString()}"
}`
}

// ---------------------------------------------------------------------------
// Generate prompt
// ---------------------------------------------------------------------------
export async function buildGeneratePrompt(
  articles: { title: string; markdown: string; publication: string }[],
  agentId: string,
): Promise<string> {
  const { name, systemPrompt } = await getAgentContext(agentId)
  const narrativeGuideline = await getAgentGuideline(agentId, 'narrative')
  const articleGuideline = await getAgentGuideline(agentId, 'article')

  const articleBlocks = articles
    .map((a, i) => `--- Article ${i + 1} (${a.publication}) ---\nTitle: ${a.title}\n${a.markdown.slice(0, 3000)}`)
    .join('\n\n')

  return `You are a senior journalist for "${name}". Generate a comprehensive coverage post from these source articles.
${systemPrompt ? `\nAGENT FOCUS:\n${systemPrompt}\n` : ''}${narrativeGuideline ? `\nNARRATIVE GUIDELINES:\n${narrativeGuideline}\n` : ''}${articleGuideline ? `\nARTICLE GUIDELINES:\n${articleGuideline}\n` : ''}
${articleBlocks}

Return JSON:
{
  "title": "Neutral, compelling headline",
  "summary": "300-500 word news summary with [N] source citations",
  "social_posts": {
    "x": "Under 280 chars with hashtags",
    "linkedin": "Professional 150-300 word post with 3 hashtags",
    "facebook": "40-80 words ending with a question",
    "instagram": "125-200 word caption with 5-8 hashtags",
    "threads": "Under 500 chars, conversational"
  },
  "image_prompt": "Detailed prompt for generating a photojournalistic image",
  "slug": "url-friendly-slug-max-60-chars",
  "category": "Primary Category",
  "image_headline": "Short headline for image overlay (max 50 chars)",
  "confidence_score": 1-5
}

Rules:
- Every factual claim must cite sources as [N] where N matches article numbers
- Headline must be neutral and informative, not clickbait
- Social posts must respect platform character limits
- Image prompt should describe a realistic, photojournalistic scene (no text)`
}
