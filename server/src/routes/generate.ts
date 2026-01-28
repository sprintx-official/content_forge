import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody, generateSchema } from '../validation/index.js'
import { callProvider, ProviderError } from '../services/aiProvider.js'
import { buildSystemPrompt, buildSingleAgentSystemPrompt, buildUserPrompt, getMaxTokens, type AgentContext } from '../services/promptBuilder.js'
import { calculateCost } from '../services/costCalculator.js'
import { calculateMetrics } from '../services/metricsCalculator.js'
import { getTips } from '../services/tipsProvider.js'
import type { AuthenticatedRequest, ApiKeyRow, AgentRow, AgentFileRow, WorkflowStepRow, FeedbackRow, AgentMemoryRow, WorkflowAccessRow } from '../types.js'

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
router.post('/', authenticate, validateBody(generateSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { input, workflowId } = req.body as GenerateBody

  // Build agent contexts if workflow is provided
  let agentContexts: AgentContext[] | undefined
  let workflowName: string | undefined
  let resolvedModelId: string | null = null

  const effectiveWorkflowId = workflowId || input.workflowId

  // Workflow access guard for non-admin users
  if (effectiveWorkflowId && req.user!.role !== 'admin') {
    const access = await queryOne<WorkflowAccessRow>(
      'SELECT * FROM workflow_access WHERE workflow_id = $1 AND user_id = $2',
      [effectiveWorkflowId, req.user!.userId]
    )
    if (!access) {
      res.status(403).json({ error: 'You do not have access to this workflow' })
      return
    }
  }

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

  // Build initial user prompt
  const initialUserPrompt = buildUserPrompt({
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
    const now = new Date().toISOString()
    let finalContent = ''
    let totalInputTokens = 0
    let totalCachedInputTokens = 0
    let totalOutputTokens = 0
    let totalCostUsd = 0

    // Store pipeline data with input/output for each agent
    const agentPipeline: Array<{
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
      tokenUsage: {
        inputTokens: number
        cachedInputTokens: number
        outputTokens: number
        totalTokens: number
        costUsd: number
        model: string
      }
    }> = []

    // Execute agents sequentially if we have a pipeline
    if (agentContexts && agentContexts.length > 0) {
      let currentInput = initialUserPrompt

      for (let i = 0; i < agentContexts.length; i++) {
        const ctx = agentContexts[i]
        const isLastAgent = i === agentContexts.length - 1

        // Build system prompt for this specific agent
        const agentSystemPrompt = buildSingleAgentSystemPrompt(ctx)

        // For subsequent agents, modify the user prompt to process previous output
        let agentUserPrompt: string
        if (i === 0) {
          // First agent gets the original user prompt
          agentUserPrompt = currentInput
        } else {
          // Subsequent agents receive the previous output as input to refine/process
          agentUserPrompt = `You are continuing in a content pipeline. The previous agent produced the following content:

---
${currentInput}
---

Your task: ${ctx.instructions || 'Process and improve the above content based on your expertise.'}

Requirements from the original request:
- Content type: ${input.contentType}
- Tone: ${input.tone}
- Target audience: ${input.audience}
- Topic: ${input.topic}

${isLastAgent ? 'This is the final step. Produce the polished, final content.' : 'Process and pass the improved content to the next agent.'}`
        }

        // Call AI for this agent
        const agentResponse = await callProvider({
          provider,
          model: ctx.agent.model || resolvedModelId,
          apiKey: keyRow.api_key,
          systemPrompt: agentSystemPrompt,
          userPrompt: agentUserPrompt,
          maxTokens,
        })

        // Track tokens and cost separately
        totalInputTokens += agentResponse.inputTokens
        totalCachedInputTokens += agentResponse.cachedInputTokens
        totalOutputTokens += agentResponse.outputTokens
        const agentCost = await calculateCost(
          provider,
          ctx.agent.model || resolvedModelId,
          agentResponse.inputTokens,
          agentResponse.outputTokens,
          agentResponse.cachedInputTokens
        )
        totalCostUsd += agentCost

        // Store this agent's pipeline data with input/output and token usage
        agentPipeline.push({
          agentName: ctx.agent.name,
          agentDescription: ctx.agent.description,
          agentIcon: ctx.agent.icon,
          systemPrompt: ctx.agent.system_prompt,
          knowledgeBase: ctx.agent.knowledge_base || null,
          files: ctx.files.map(f => f.name),
          instructions: ctx.instructions,
          feedback: ctx.feedback || null,
          memories: ctx.memories || null,
          input: i === 0 ? initialUserPrompt : currentInput,
          output: agentResponse.content,
          tokenUsage: {
            inputTokens: agentResponse.inputTokens,
            cachedInputTokens: agentResponse.cachedInputTokens,
            outputTokens: agentResponse.outputTokens,
            totalTokens: agentResponse.inputTokens + agentResponse.cachedInputTokens + agentResponse.outputTokens,
            costUsd: agentCost,
            model: ctx.agent.model || resolvedModelId,
          },
        })

        // Pass output to next agent as input
        currentInput = agentResponse.content
        finalContent = agentResponse.content
      }
    } else {
      // No pipeline - single call with default system prompt
      const systemPrompt = buildSystemPrompt()
      const aiResponse = await callProvider({
        provider,
        model: resolvedModelId,
        apiKey: keyRow.api_key,
        systemPrompt,
        userPrompt: initialUserPrompt,
        maxTokens,
      })

      finalContent = aiResponse.content
      totalInputTokens = aiResponse.inputTokens
      totalCachedInputTokens = aiResponse.cachedInputTokens
      totalOutputTokens = aiResponse.outputTokens
      totalCostUsd = await calculateCost(
        provider,
        resolvedModelId,
        aiResponse.inputTokens,
        aiResponse.outputTokens,
        aiResponse.cachedInputTokens
      )
    }

    // Compute metrics and tips based on final content
    const metrics = calculateMetrics(finalContent)
    const tips = getTips(input.contentType)

    // Build output
    const output: Record<string, unknown> = {
      content: finalContent,
      metrics,
      tips,
      generatedAt: now,
      tokenUsage: {
        inputTokens: totalInputTokens,
        cachedInputTokens: totalCachedInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalCachedInputTokens + totalOutputTokens,
        costUsd: totalCostUsd,
        provider,
        model: resolvedModelId,
      },
      ...(agentPipeline.length > 0 && { agentPipeline }),
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
        totalInputTokens,
        totalOutputTokens,
        totalInputTokens + totalOutputTokens,
        totalCostUsd,
        now,
      ]
    )

    // Save memory for each participating agent with their specific output
    if (agentContexts && agentContexts.length > 0) {
      for (let i = 0; i < agentContexts.length; i++) {
        const ctx = agentContexts[i]
        const agentOutput = agentPipeline[i]?.output || finalContent
        await execute(
          'INSERT INTO agent_memory (id, agent_id, topic, summary, output_text, history_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            crypto.randomUUID(),
            ctx.agent.id,
            input.topic,
            agentOutput.slice(0, 200),
            agentOutput,
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
