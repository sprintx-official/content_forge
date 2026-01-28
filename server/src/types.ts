import type { Request } from 'express'

export interface JwtPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload
}

export interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
  role: 'admin' | 'user'
  created_at: string
}

export interface AgentRow {
  id: string
  name: string
  description: string
  system_prompt: string
  knowledge_base: string
  icon: string
  model: string
  created_at: string
  updated_at: string
}

export interface AgentFileRow {
  id: string
  agent_id: string
  name: string
  type: string
  size: number
  r2_key: string
  content_text: string
  uploaded_at: string
}

export interface WorkflowRow {
  id: string
  name: string
  description: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface WorkflowStepRow {
  id: string
  workflow_id: string
  agent_id: string
  instructions: string
  sort_order: number
}

export interface FeedbackRow {
  id: string
  agent_id: string
  user_id: string
  user_name: string
  text: string
  rating: number
  created_at: string
}

export interface HistoryRow {
  id: string
  user_id: string
  input_json: string
  output_json: string
  workflow_name: string | null
  created_at: string
}

export interface HistoryRowWithUser extends HistoryRow {
  user_name: string
}

export interface ApiKeyRow {
  id: string
  provider: string
  api_key: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface TokenUsageRow {
  id: string
  history_id: string
  user_id: string
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  created_at: string
}

export interface ModelPricingRow {
  id: string
  provider: string
  model_pattern: string
  input_price_per_million: number
  cached_input_price_per_million: number
  output_price_per_million: number
  updated_at: string
}

export interface AgentMemoryRow {
  id: string
  agent_id: string
  topic: string
  summary: string
  output_text: string
  history_id: string
  created_at: string
}

export interface WorkflowAccessRow {
  id: string
  workflow_id: string
  user_id: string
  created_at: string
}
