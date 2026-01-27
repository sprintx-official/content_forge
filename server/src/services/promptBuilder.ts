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
}

const LENGTH_GUIDANCE: Record<string, string> = {
  short: '150-250 words. Be concise and focused.',
  medium: '400-600 words. Provide moderate depth with clear structure.',
  long: '800-1200 words. Provide comprehensive coverage with detailed sections.',
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
  let prompt = `You are ContentForge, an expert content creation assistant. You produce high-quality, well-structured content tailored to the user's specifications. Always write in a natural, human style. Do not include meta-commentary about the writing process — just produce the content directly.`

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

export function buildUserPrompt(input: PromptInput): string {
  let lengthGuide: string
  if (input.length === 'custom' && input.customWordCount) {
    lengthGuide = buildCustomLengthGuidance(input.customWordCount, input.tolerancePercent ?? 10)
  } else {
    lengthGuide = LENGTH_GUIDANCE[input.length] || LENGTH_GUIDANCE.medium
  }

  return `Create a ${input.contentType} about the following topic:

Topic: ${input.topic}

Requirements:
- Content type: ${input.contentType}
- Tone: ${input.tone}
- Target audience: ${input.audience}
- Length: ${lengthGuide}

Write the content directly. Do not include titles like "Title:" or labels — just write the content as it should appear.`
}

export function getMaxTokens(length: string, customWordCount?: number, tolerancePercent?: number): number {
  if (length === 'custom' && customWordCount) {
    return getCustomMaxTokens(customWordCount, tolerancePercent ?? 10)
  }
  return MAX_TOKENS[length] || MAX_TOKENS.medium
}
