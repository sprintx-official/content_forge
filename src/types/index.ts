export type ContentType = 'article' | 'blog' | 'social' | 'press' | 'script' | 'ad-copy'
export type Tone = 'professional' | 'casual' | 'persuasive' | 'informative' | 'inspirational'
export type Audience = 'general' | 'students' | 'professionals' | 'youth' | 'seniors'
export type ContentLength = 'short' | 'medium' | 'long' | 'custom'
export type ProcessingStageId = 'analyzing' | 'researching' | 'drafting' | 'polishing' | 'complete' | string
export type ProcessingStatus = 'pending' | 'active' | 'completed'
export type UserRole = 'admin' | 'user'

export interface ForgeInput {
  contentType: ContentType
  tone: Tone
  audience: Audience
  length: ContentLength
  customWordCount?: number
  tolerancePercent?: number
  topic: string
  workflowId?: string
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
