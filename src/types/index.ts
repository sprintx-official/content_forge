export type ContentType = 'article' | 'blog' | 'social' | 'press' | 'script' | 'ad-copy'
export type Tone = 'professional' | 'casual' | 'persuasive' | 'informative' | 'inspirational'
export type Audience = 'general' | 'students' | 'professionals' | 'youth' | 'seniors'
export type ContentLength = 'short' | 'medium' | 'long' | 'custom'
export type ProcessingStageId = 'analyzing' | 'researching' | 'drafting' | 'polishing' | 'complete' | string
export type ProcessingStatus = 'pending' | 'active' | 'completed'
export type UserRole = 'admin' | 'user'

// ── Forge mode (tab system) ────────────────────────────────
export type ForgeMode = 'content' | 'chat' | 'image' | 'code'
export type WorkflowStepType = 'text' | 'image' | 'code'

// ── Image generation types ─────────────────────────────────
export interface ImageSize {
  width: number
  height: number
  label: string
}
export type ImageStyle = 'natural' | 'vivid' | 'anime' | 'photographic' | 'digital-art'

// ── Code generation types ──────────────────────────────────
export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'sql'
  | 'bash'
  | 'rust'
  | 'go'
  | 'java'
  | 'other'

// ── Chat types ─────────────────────────────────────────────
export interface ChatConversation {
  id: string
  userId: string
  title: string
  lastMessage: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  provider?: string
  tokenUsage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
  }
  createdAt: string
}

// ── Generated image types ──────────────────────────────────
export interface GeneratedImage {
  id: string
  userId: string
  prompt: string
  revisedPrompt?: string
  r2Key: string
  url: string
  width: number
  height: number
  style: string
  provider: string
  model: string
  costUsd: number
  createdAt: string
}

export interface ForgeInput {
  contentType: ContentType
  tone: Tone
  audience: Audience
  length: ContentLength
  customWordCount?: number
  tolerancePercent?: number
  topic: string
  workflowId?: string
  /** When set, AI will refine this content instead of generating from scratch */
  refineContent?: string
}

export interface ContentMetrics {
  readabilityScore: number
  gradeLevel: number
  wordCount: number
  sentenceCount: number
  avgSentenceLength: number
  readTimeMinutes: number
}

export interface WritingTip {
  title: string
  description: string
  example?: string
}

export interface TokenUsage {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  provider: string
  model: string
}

export interface AgentPipelineStep {
  agentName: string
  agentDescription: string
  agentIcon: string
  systemPrompt: string
  knowledgeBase: string | null
  files: string[]
  instructions: string
  feedback: { avgRating: number; recentTexts: string[] } | null
  memories: { topic: string; summary: string; createdAt: string }[] | null
  input: string
  output: string
  tokenUsage?: {
    inputTokens: number
    cachedInputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    model: string
  }
}

export interface ModelPricing {
  id: string
  provider: AiProvider
  modelPattern: string
  inputPricePerMillion: number
  cachedInputPricePerMillion: number
  outputPricePerMillion: number
  updatedAt: string
}

export interface ForgeOutput {
  content: string
  metrics: ContentMetrics
  tips: WritingTip[]
  generatedAt: string
  tokenUsage?: TokenUsage
  agentPipeline?: AgentPipelineStep[]
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface HistoryItem {
  id: string
  input: ForgeInput
  output: ForgeOutput
  workflowName?: string
  userName?: string
  createdAt: string
}

export interface KnowledgeBaseFile {
  id: string
  name: string
  type: string
  size: number
  r2Key: string
  contentText: string
  uploadedAt: string
}

export interface ApiErrorResponse {
  error: string
}

export interface AgentConfig {
  id: string
  name: string
  description: string
  systemPrompt: string
  knowledgeBase: string
  knowledgeBaseFiles: KnowledgeBaseFile[]
  icon: string
  model: string
  createdAt: string
  updatedAt: string
}

export interface FeedbackItem {
  id: string
  agentId: string
  userId: string
  userName: string
  text: string
  rating: number
  createdAt: string
}

export interface WorkflowStep {
  agentId: string
  instructions: string
  stepType?: WorkflowStepType
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  isActive: boolean
  assignedUserIds?: string[]
  createdAt: string
  updatedAt: string
}

export interface ProcessingStage {
  id: ProcessingStageId | string
  label: string
  agent: string
  status: ProcessingStatus
  message: string
}

export interface ContentTypeOption {
  id: ContentType
  name: string
  description: string
  icon: string
  placeholder: string
}

export interface ToneOption {
  id: Tone
  name: string
  description: string
}

export interface AudienceOption {
  id: Audience
  name: string
  description: string
}

export interface LengthOption {
  id: ContentLength
  name: string
  wordRange: string
  words: number
}

export type AiProvider = 'openai' | 'anthropic' | 'xai' | 'google'

export interface ApiKeyConfig {
  id: string
  provider: AiProvider
  maskedKey: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AiModel {
  id: string
  name: string
  provider: AiProvider
}

export interface ProviderUsageSummary {
  provider: string
  generation_count: number
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_cost_usd: number
}

export interface ModelUsageSummary extends ProviderUsageSummary {
  model: string
}

export interface UsageStats {
  byModel: ModelUsageSummary[]
  byProvider: ProviderUsageSummary[]
}

export interface AgentMemoryItem {
  id: string
  agentId: string
  topic: string
  summary: string
  outputText: string
  historyId: string
  createdAt: string
}

// ── Multi-file parsing types ──────────────────────────────

/** Represents a single parsed file from multi-file agent output */
export interface ParsedFile {
  /** Filename including extension, e.g. "article.md" */
  filename: string
  /** The file extension without dot, e.g. "md", "txt", "json", "html" */
  extension: string
  /** The raw content of this file section */
  content: string
}

/** Download format options */
export type DownloadFormat = 'txt' | 'html' | 'md' | 'json' | 'pdf'

/** Available download actions for a given file type */
export interface FileDownloadOption {
  format: DownloadFormat
  label: string
  icon: string
}

// ── Refine / diff types ───────────────────────────────────

/** State for the refine/diff feature */
export interface RefineState {
  /** The original content before refinement */
  originalContent: string
  /** The new content after refinement */
  refinedContent: string
  /** Whether the diff view is currently showing */
  isShowingDiff: boolean
  /** Whether a refinement request is in progress */
  isRefining: boolean
  /** The tone used for refinement */
  refineTone: Tone
  /** The audience used for refinement */
  refineAudience: Audience
}
