import type { AgentRow, AgentFileRow } from '../types.js'

export interface AgentFeedbackContext {
  avgRating: number
  recentTexts: string[]
}

export interface AgentMemoryContext {
  topic: string
  summary: string
  createdAt: string
}

export interface AgentContext {
  agent: AgentRow
  files: AgentFileRow[]
  instructions: string
  stepType?: string
  feedback?: AgentFeedbackContext
  memories?: AgentMemoryContext[]
}

export interface PromptInput {
  contentType: string
  topic: string
  tone: string
  audience: string
  length: string
  customWordCount?: number
  tolerancePercent?: number
  /** Dynamic guidance from database (overrides hardcoded fallbacks) */
  contentTypeGuidance?: string
  toneGuidance?: string
  audienceGuidance?: string
}

const LENGTH_GUIDANCE: Record<string, string> = {
  short: '150-250 words. Be concise and focused.',
  medium: '400-600 words. Provide moderate depth with clear structure.',
  long: '800-1200 words. Provide comprehensive coverage with detailed sections.',
}

// ── Rich descriptions for tone, audience, and content type ──────────────

const TONE_GUIDANCE: Record<string, string> = {
  professional:
    'Professional — Use formal, authoritative language. Maintain a polished, business-appropriate voice. Avoid slang, contractions, and overly casual expressions. Convey expertise and credibility.',
  casual:
    'Casual — Write in a friendly, conversational tone as if chatting with a friend. Use contractions, simple words, and a relaxed style. Feel approachable and warm.',
  persuasive:
    'Persuasive — Use compelling, action-oriented language designed to convince and motivate. Employ rhetorical techniques: strong arguments, emotional appeal, social proof, and clear calls to action.',
  informative:
    'Informative — Prioritize clarity and accuracy. Present facts, data, and explanations in a neutral, objective voice. Focus on educating the reader without bias or opinion.',
  inspirational:
    'Inspirational — Use uplifting, motivational language that energizes the reader. Tell stories, paint vivid pictures, and appeal to emotions. Encourage action and positive thinking.',
}

const AUDIENCE_GUIDANCE: Record<string, string> = {
  'general public':
    'General Public — Write for everyday readers with no specialized knowledge. Use simple vocabulary (8th-grade reading level), relatable examples, and avoid jargon. If you must use a technical term, explain it immediately.',
  students:
    'Students — Write for learners (high school to college age). Be educational but engaging. Use examples, analogies, and clear explanations. Break complex concepts into digestible pieces. Make it interesting enough to hold attention.',
  professionals:
    'Professionals — Write for experienced adults in a work context. You can use industry-standard terminology without over-explaining. Be concise and respect their time. Focus on actionable insights and practical value.',
  'youth (gen z)':
    'Youth / Gen Z — Write for a younger audience (16-25). Keep it authentic, snappy, and direct. Use contemporary references and a slightly informal voice. Avoid sounding corporate or preachy. Short paragraphs, punchy sentences.',
  seniors:
    'Seniors — Write for an older adult audience. Use clear, respectful language with a warm tone. Avoid trendy slang or obscure references. Prefer larger conceptual clarity over rapid-fire information. Be thorough and patient in explanations.',
}

const CONTENT_TYPE_GUIDANCE: Record<string, string> = {
  article:
    'Article — Produce a long-form journalistic or feature article with structured sections, citations where appropriate, and a narrative arc. Include an engaging lead paragraph, well-organized body sections with subheadings, and a strong conclusion.',
  'blog post':
    'Blog Post — Write conversational, opinion-driven web content. Use a personal voice, hook the reader early, include practical takeaways, and optimize for online readability (short paragraphs, subheadings, lists).',
  'social media':
    'Social Media — Create punchy, shareable micro-content optimized for social platforms. Be concise, attention-grabbing, and include hashtag-worthy phrases. Front-load the most compelling point.',
  'press release':
    'Press Release — Follow AP style and inverted-pyramid structure. Lead with the most newsworthy facts (who, what, when, where, why). Include a dateline, quotes from relevant stakeholders, and boilerplate information.',
  script:
    'Script — Write a broadcast-ready script for video, radio, podcast, or presentation. Include speaker cues, timing notes where helpful, and natural-sounding dialogue. Write for the ear, not the eye.',
  'ad copy':
    'Ad Copy — Create persuasive marketing and advertising copy. Lead with a strong headline, highlight benefits over features, use urgency and social proof, and end with a clear call to action.',
}

const MAX_TOKENS: Record<string, number> = {
  short: 1024,
  medium: 2048,
  long: 4096,
}

function buildCustomLengthGuidance(wordCount: number, tolerancePercent: number): string {
  const lower = Math.round(wordCount * (1 - tolerancePercent / 100))
  const upper = Math.round(wordCount * (1 + tolerancePercent / 100))
  return `${lower}-${upper} words (target: ${wordCount} words, ±${tolerancePercent}% tolerance). Match this word count as closely as possible.`
}

function getCustomMaxTokens(wordCount: number, tolerancePercent: number): number {
  const upperWords = Math.round(wordCount * (1 + tolerancePercent / 100))
  // ~1.5 tokens per word, with headroom
  return Math.max(1024, Math.ceil(upperWords * 2))
}

export function buildSystemPrompt(agentContexts?: AgentContext[]): string {
  let prompt = `You are ContentForge, an expert content creation assistant. You produce high-quality, well-structured content tailored to the user's specifications. Always write in a natural, human style. Do not include meta-commentary about the writing process — just produce the content directly.

Readability & structure rules (ALWAYS follow these):
- Use short, clear sentences. Aim for an average of 15-20 words per sentence.
- Prefer simple, everyday words over complex or academic vocabulary (e.g. "use" not "utilize", "help" not "facilitate", "start" not "commence").
- Break content into short paragraphs (2-4 sentences each).
- Use headings and subheadings to organize sections.
- Use bullet points or numbered lists when presenting multiple items.
- Vary sentence length to create a natural rhythm — mix short punchy sentences with slightly longer ones.
- Avoid passive voice when active voice is clearer.
- Target a Flesch Reading Ease score of 60 or higher (easily understood by a general audience).`

  if (agentContexts && agentContexts.length > 0) {
    for (const ctx of agentContexts) {
      if (ctx.agent.system_prompt) {
        prompt += `\n\nAgent "${ctx.agent.name}" instructions:\n${ctx.agent.system_prompt}`
      }
      if (ctx.agent.knowledge_base) {
        prompt += `\n\nKnowledge base for "${ctx.agent.name}":\n${ctx.agent.knowledge_base}`
      }
      if (ctx.files.length > 0) {
        for (const file of ctx.files) {
          if (file.content_text) {
            prompt += `\n\nFile "${file.name}":\n${file.content_text}`
          }
        }
      }
      if (ctx.instructions) {
        prompt += `\n\nStep instructions: ${ctx.instructions}`
      }
      if (ctx.feedback && ctx.feedback.recentTexts.length > 0) {
        prompt += `\n\nUser feedback for "${ctx.agent.name}" (avg rating: ${ctx.feedback.avgRating}/5):`
        for (const text of ctx.feedback.recentTexts) {
          prompt += `\n- ${text}`
        }
      }
      if (ctx.memories && ctx.memories.length > 0) {
        prompt += `\n\nRecent outputs by "${ctx.agent.name}" (for context and consistency):`
        for (const mem of ctx.memories) {
          const date = mem.createdAt.slice(0, 10)
          prompt += `\n- [${date}] Topic: "${mem.topic}" — ${mem.summary}`
        }
      }
    }
  }

  return prompt
}

/**
 * Build a system prompt for a single agent in a pipeline
 */
export function buildSingleAgentSystemPrompt(ctx: AgentContext): string {
  let prompt = `You are ContentForge, an expert content creation assistant. You produce high-quality, well-structured content tailored to the user's specifications. Always write in a natural, human style. Do not include meta-commentary about the writing process — just produce the content directly.

Readability & structure rules (ALWAYS follow these):
- Use short, clear sentences. Aim for an average of 15-20 words per sentence.
- Prefer simple, everyday words over complex or academic vocabulary (e.g. "use" not "utilize", "help" not "facilitate", "start" not "commence").
- Break content into short paragraphs (2-4 sentences each).
- Use headings and subheadings to organize sections.
- Use bullet points or numbered lists when presenting multiple items.
- Vary sentence length to create a natural rhythm — mix short punchy sentences with slightly longer ones.
- Avoid passive voice when active voice is clearer.
- Target a Flesch Reading Ease score of 60 or higher (easily understood by a general audience).`

  if (ctx.agent.system_prompt) {
    prompt += `\n\nAgent "${ctx.agent.name}" instructions:\n${ctx.agent.system_prompt}`
  }
  if (ctx.agent.knowledge_base) {
    prompt += `\n\nKnowledge base for "${ctx.agent.name}":\n${ctx.agent.knowledge_base}`
  }
  if (ctx.files.length > 0) {
    for (const file of ctx.files) {
      if (file.content_text) {
        prompt += `\n\nFile "${file.name}":\n${file.content_text}`
      }
    }
  }
  if (ctx.instructions) {
    prompt += `\n\nStep instructions: ${ctx.instructions}`
  }
  if (ctx.feedback && ctx.feedback.recentTexts.length > 0) {
    prompt += `\n\nUser feedback for "${ctx.agent.name}" (avg rating: ${ctx.feedback.avgRating}/5):`
    for (const text of ctx.feedback.recentTexts) {
      prompt += `\n- ${text}`
    }
  }
  if (ctx.memories && ctx.memories.length > 0) {
    prompt += `\n\nRecent outputs by "${ctx.agent.name}" (for context and consistency):`
    for (const mem of ctx.memories) {
      const date = mem.createdAt.slice(0, 10)
      prompt += `\n- [${date}] Topic: "${mem.topic}" — ${mem.summary}`
    }
  }

  return prompt
}

export function buildUserPrompt(input: PromptInput): string {
  let lengthGuide: string
  if (input.length === 'custom' && input.customWordCount) {
    lengthGuide = buildCustomLengthGuidance(input.customWordCount, input.tolerancePercent ?? 10)
  } else {
    lengthGuide = LENGTH_GUIDANCE[input.length] || LENGTH_GUIDANCE.medium
  }

  const toneGuide = input.toneGuidance || TONE_GUIDANCE[input.tone.toLowerCase()] || `${input.tone} — Adapt your writing style to match a "${input.tone}" tone throughout the piece.`
  const audienceGuide = input.audienceGuidance || AUDIENCE_GUIDANCE[input.audience.toLowerCase()] || `${input.audience} — Write specifically for a "${input.audience}" audience, adapting vocabulary, examples, and depth accordingly.`
  const contentTypeGuide = input.contentTypeGuidance || CONTENT_TYPE_GUIDANCE[input.contentType.toLowerCase()] || `${input.contentType} — Write a well-structured ${input.contentType} following standard conventions for this format.`

  return `Create a ${input.contentType} about the following topic:

Topic: ${input.topic}

Content format:
${contentTypeGuide}

Voice & tone:
${toneGuide}

Target audience:
${audienceGuide}

Length: ${lengthGuide}

Structure & readability:
- Start with a compelling opening paragraph that hooks the reader.
- Use clear headings and subheadings to break the content into scannable sections.
- Keep paragraphs short (2-4 sentences). Use bullet points where helpful.
- Use simple, direct language. Keep sentences around 15-20 words on average.
- End with a clear conclusion or call to action.

Write the content directly. Do not include titles like "Title:" or labels — just write the content as it should appear.`
}

export function getMaxTokens(length: string, customWordCount?: number, tolerancePercent?: number): number {
  if (length === 'custom' && customWordCount) {
    return getCustomMaxTokens(customWordCount, tolerancePercent ?? 10)
  }
  return MAX_TOKENS[length] || MAX_TOKENS.medium
}

export function buildSocialPostsPrompt(content: string, topic: string, tone: string): string {
  return `You are a social media expert. Based on the article content below, generate social media posts for 5 platforms.

Topic: ${topic}
Tone: ${tone}

Article content:
---
${content.slice(0, 3000)}
---

Generate a JSON object with exactly this structure (no markdown fences, ONLY valid JSON):
{
  "x": { "content": "tweet text here (max 280 chars, punchy and engaging)", "hashtags": ["tag1", "tag2", "tag3"] },
  "facebook": { "content": "facebook post (max 500 chars, conversational with context)", "hashtags": ["tag1", "tag2"] },
  "linkedin": { "content": "linkedin post (max 700 chars, professional and insightful)", "hashtags": ["tag1", "tag2", "tag3"] },
  "instagram": { "content": "instagram caption (max 400 chars, engaging with emoji)", "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"] },
  "threads": { "content": "threads post (max 500 chars, casual and conversational)", "hashtags": ["tag1", "tag2"] }
}

Rules:
- Each post must be unique and tailored to the platform's style
- Do NOT include hashtags in the content text — put them in the hashtags array only
- X/Twitter must be under 280 characters
- Keep hashtags relevant, lowercase, no # symbol
- Output ONLY the JSON object, nothing else`
}

export function buildCodeSystemPrompt(language?: string): string {
  let prompt = `You are an expert programmer. Generate clean, well-commented code based on the user's request.
Output ONLY code in a single fenced code block with the language specified.
Do not include any explanations, introductions, or commentary outside the code block unless the user explicitly asks for it.
The code should be production-quality, well-structured, and follow best practices for the specified language.`
  if (language && language !== 'other') {
    prompt += `\nThe user wants code in ${language}.`
  }
  return prompt
}

export function buildImagePromptFromContext(previousOutput: string, topic: string): string {
  return `Based on the following content, create a detailed image prompt for an AI image generator.
The image should visually represent the key themes and concepts from the content.

Topic: ${topic}

Content:
---
${previousOutput.slice(0, 2000)}
---

Generate a single, detailed image generation prompt that describes the visual scene, style, composition, colors, and mood.
Output ONLY the image prompt text, nothing else.`
}

export function buildVideoPromptFromContext(previousOutput: string, topic: string): string {
  return `Based on the following content, create a detailed video generation prompt for Google Veo.
The video should visually represent the key themes and concepts from the content.

Topic: ${topic}

Content:
---
${previousOutput.slice(0, 2000)}
---

Generate a single, detailed video generation prompt that describes the visual scene, camera movement, lighting, mood, action, and composition.
The video will be 8 seconds long. Focus on a single compelling scene.
Output ONLY the video prompt text, nothing else.`
}
