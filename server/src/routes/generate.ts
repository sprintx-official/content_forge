import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { callProvider, ProviderError } from '../services/aiProvider.js'
import { buildSystemPrompt, buildUserPrompt, getMaxTokens, type AgentContext } from '../services/promptBuilder.js'
import { calculateCost } from '../services/costCalculator.js'
import { calculateMetrics } from '../services/metricsCalculator.js'
import { getTips } from '../services/tipsProvider.js'
import type { AuthenticatedRequest, ApiKeyRow, AgentRow, AgentFileRow, WorkflowStepRow, FeedbackRow, AgentMemoryRow } from '../types.js'

const router = Router()

/**
 * Infer the AI provider from a model ID string.
 */
function inferProvider(modelId: string): string | null {
  if (/^(gpt-|o\d|chatgpt-)/i.test(modelId)) return 'openai'
  if (/^claude-/i.test(modelId)) return 'anthropic'
  if (/^grok-/i.test(modelId)) return 'xai'
  if (/^gemini-/i.test(modelId)) return 'google'
  return null
}

interface GenerateBody {
  input: {
    contentType: string
    topic: string
    tone: string
    audience: string
    length: string
    customWordCount?: number
    tolerancePercent?: number
    workflowId?: string
  }
  workflowId?: string
}

// POST /api/generate
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { input, workflowId } = req.body as GenerateBody

  // Validate required fields
  if (!input?.topic?.trim()) {
    res.status(400).json({ error: 'Topic is required' })
    return
  }

  // Build agent contexts if workflow is provided
  let agentContexts: AgentContext[] | undefined
  let workflowName: string | undefined
  let resolvedModelId: string | null = null

  const effectiveWorkflowId = workflowId || input.workflowId
  if (effectiveWorkflowId) {
    const workflow = await queryOne<{ name: string }>(
      'SELECT * FROM workflows WHERE id = $1', [effectiveWorkflowId]
    )
    if (workflow) {
      workflowName = workflow.name
      const steps = await query<WorkflowStepRow>(
        'SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY sort_order ASC', [effectiveWorkflowId]
      )

      agentContexts = []
      for (const step of steps) {
        const agent = await queryOne<AgentRow>(
          'SELECT * FROM agents WHERE id = $1', [step.agent_id]
        )
        if (agent) {
          const files = await query<AgentFileRow>(
            'SELECT * FROM agent_files WHERE agent_id = $1', [agent.id]
          )

          // Load feedback for this agent
          const feedbackRows = await query<FeedbackRow>(
            'SELECT * FROM feedback WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10', [agent.id]
          )
          let feedbackCtx: AgentContext['feedback']
          if (feedbackRows.length > 0) {
            const sum = feedbackRows.reduce((acc, r) => acc + r.rating, 0)
            const avgRating = Math.round((sum / feedbackRows.length) * 10) / 10
            const recentTexts = feedbackRows.slice(0, 5).map((r) => r.text).filter(Boolean)
            feedbackCtx = { avgRating, recentTexts }
          }

          // Load memory for this agent
          const memoryRows = await query<AgentMemoryRow>(
            'SELECT * FROM agent_memory WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10', [agent.id]
          )
          const memoriesCtx = memoryRows.map((m) => ({
            topic: m.topic,
            summary: m.summary,
            createdAt: m.created_at,
          }))

          agentContexts.push({
            agent,
            files,
            instructions: step.instructions,
            feedback: feedbackCtx,
            memories: memoriesCtx.length > 0 ? memoriesCtx : undefined,
          })

          // Use the first agent that has a model configured
          if (!resolvedModelId && agent.model && agent.model.trim()) {
            resolvedModelId = agent.model.trim()
          }
        }
      }
    }
  }

  // If no model found from workflow agents, pick the first available model from active API keys
  // Priority order: openai > anthropic > xai > google (free tiers exhaust quickly on Google)
  if (!resolvedModelId) {
    const activeKeys = await query<{ provider: string }>(
      'SELECT provider FROM api_keys WHERE is_active = 1'
    )
    const activeProviders = new Set(activeKeys.map((r) => r.provider))

    const fallbackOrder: { provider: string; model: string }[] = [
      { provider: 'openai', model: 'gpt-4o-mini' },
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'xai', model: 'grok-3-mini' },
      { provider: 'google', model: 'gemini-2.0-flash' },
    ]

    for (const entry of fallbackOrder) {
      if (activeProviders.has(entry.provider)) {
        resolvedModelId = entry.model
        break
      }
    }
  }

  if (!resolvedModelId) {
    res.status(422).json({ error: 'No AI model available. Configure an API key in Settings or assign a model to a workflow agent.' })
    return
  }

  // Infer provider from model ID
  const provider = inferProvider(resolvedModelId)
  if (!provider) {
    res.status(422).json({ error: `Cannot determine provider for model "${resolvedModelId}". Please configure the agent model correctly.` })
    return
  }

  // Look up active API key for provider
  const keyRow = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1', [provider]
  )

  if (!keyRow) {
    res.status(422).json({ error: `No active API key configured for ${provider}. Add one in Settings.` })
    return
  }

  // Build prompts
  const systemPrompt = buildSystemPrompt(agentContexts)
  const userPrompt = buildUserPrompt({
    contentType: input.contentType,
    topic: input.topic,
    tone: input.tone,
    audience: input.audience,
    length: input.length,
    customWordCount: input.customWordCount,
    tolerancePercent: input.tolerancePercent,
  })
  const maxTokens = getMaxTokens(input.length, input.customWordCount, input.tolerancePercent)

  try {
    // Call AI provider
    const aiResponse = await callProvider({
      provider,
      model: resolvedModelId,
      apiKey: keyRow.api_key,
      systemPrompt,
      userPrompt,
      maxTokens,
    })

    // Calculate cost
    const costUsd = await calculateCost(provider, resolvedModelId, aiResponse.inputTokens, aiResponse.outputTokens)

    // Compute metrics and tips
    const metrics = calculateMetrics(aiResponse.content)
    const tips = getTips(input.contentType)

    const now = new Date().toISOString()

    // Build output
    const output = {
      content: aiResponse.content,
      metrics,
      tips,
      generatedAt: now,
      tokenUsage: {
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        totalTokens: aiResponse.totalTokens,
        costUsd,
        provider,
        model: resolvedModelId,
      },
    }

    // Insert into history
    const historyId = crypto.randomUUID()
    await execute(
      'INSERT INTO history (id, user_id, input_json, output_json, workflow_name, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [historyId, req.user!.userId, JSON.stringify(input), JSON.stringify(output), workflowName || null, now]
    )

    // Insert into token_usage
    await execute(
      'INSERT INTO token_usage (id, history_id, user_id, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [
        crypto.randomUUID(),
        historyId,
        req.user!.userId,
        provider,
        resolvedModelId,
        aiResponse.inputTokens,
        aiResponse.outputTokens,
        aiResponse.totalTokens,
        costUsd,
        now,
      ]
    )

    // Save memory for each participating agent
    if (agentContexts && agentContexts.length > 0) {
      for (const ctx of agentContexts) {
        await execute(
          'INSERT INTO agent_memory (id, agent_id, topic, summary, output_text, history_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            crypto.randomUUID(),
            ctx.agent.id,
            input.topic,
            aiResponse.content.slice(0, 200),
            aiResponse.content,
            historyId,
            now,
          ]
        )
      }
    }

    // Return full history item
    res.status(201).json({
      id: historyId,
      input,
      output,
      workflowName: workflowName || undefined,
      createdAt: now,
    })
  } catch (err) {
    if (err instanceof ProviderError) {
      const status = (err.statusCode === 401 || err.statusCode === 403) ? 422
        : err.statusCode === 429 ? 429
        : 502
      res.status(status).json({ error: err.message })
      return
    }
    console.error('Generation error:', err)
    res.status(500).json({ error: 'Content generation failed. Please try again.' })
  }
})

export default router
