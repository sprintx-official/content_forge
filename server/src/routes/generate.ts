import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody, generateSchema, codeGenerateSchema } from '../validation/index.js'
import { callProvider, callProviderStream, ProviderError, type GenerationResponse } from '../services/aiProvider.js'
import { buildSystemPrompt, buildSingleAgentSystemPrompt, buildUserPrompt, getMaxTokens, buildCodeSystemPrompt, buildImagePromptFromContext, type AgentContext } from '../services/promptBuilder.js'
import { generateImage } from '../services/imageProvider.js'
import { uploadToR2 } from '../services/r2.js'
import { calculateCost } from '../services/costCalculator.js'
import { calculateMetrics } from '../services/metricsCalculator.js'
import { getTips } from '../services/tipsProvider.js'
import { autoRoute } from '../services/autoRouter.js'
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
    refineContent?: string
  }
  workflowId?: string
}

// ---------------------------------------------------------------------------
// Shared pipeline setup — used by both POST / and POST /stream
// ---------------------------------------------------------------------------

interface PipelineSetup {
  input: GenerateBody['input']
  agentContexts: AgentContext[] | undefined
  workflowName: string | undefined
  resolvedModelId: string
  provider: string
  keyRow: ApiKeyRow
  initialUserPrompt: string
  maxTokens: number
}

/**
 * Validates the request and resolves all pipeline components.
 * Returns null if it already sent an error response.
 */
async function preparePipeline(req: AuthenticatedRequest, res: Response): Promise<PipelineSetup | null> {
  const { input, workflowId } = req.body as GenerateBody

  let agentContexts: AgentContext[] | undefined
  let workflowName: string | undefined
  let resolvedModelId: string | null = null

  // When refining content, skip the workflow pipeline entirely — use a simple single call
  const effectiveWorkflowId = input.refineContent ? undefined : (workflowId || input.workflowId)

  // Workflow access guard for non-admin users
  if (effectiveWorkflowId && req.user!.role !== 'admin') {
    const access = await queryOne<WorkflowAccessRow>(
      'SELECT * FROM workflow_access WHERE workflow_id = $1 AND user_id = $2',
      [effectiveWorkflowId, req.user!.userId]
    )
    if (!access) {
      res.status(403).json({ error: 'You do not have access to this workflow' })
      return null
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
            stepType: step.step_type || 'text',
            feedback: feedbackCtx,
            memories: memoriesCtx.length > 0 ? memoriesCtx : undefined,
          })

          if (!resolvedModelId && agent.model && agent.model.trim()) {
            resolvedModelId = agent.model.trim()
          }
        }
      }
    }
  }

  // Fallback model resolution — use auto-router for optimal task-type matching
  if (!resolvedModelId) {
    try {
      const autoResult = await autoRoute('text-writing')
      resolvedModelId = autoResult.model
    } catch {
      // autoRoute throws if no keys configured
    }
  }

  if (!resolvedModelId) {
    res.status(422).json({ error: 'No AI model available. Configure an API key in Settings or assign a model to a workflow agent.' })
    return null
  }

  const provider = inferProvider(resolvedModelId)
  if (!provider) {
    res.status(422).json({ error: `Cannot determine provider for model "${resolvedModelId}". Please configure the agent model correctly.` })
    return null
  }

  const keyRow = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1', [provider]
  )
  if (!keyRow) {
    res.status(422).json({ error: `No active API key configured for ${provider}. Add one in Settings.` })
    return null
  }

  // Build initial user prompt
  let initialUserPrompt: string
  if (input.refineContent) {
    initialUserPrompt = `Refine the following content by adjusting the tone to "${input.tone}" and targeting the "${input.audience}" audience. Preserve the original meaning, structure, and key information. Only change the voice, word choice, and style as needed.

Original content:
---
${input.refineContent}
---

Requirements:
- Content type: ${input.contentType}
- New tone: ${input.tone}
- New target audience: ${input.audience}
- Maintain approximately the same length
- Do not add or remove factual content
- Return ONLY the refined content, no explanations`
  } else {
    initialUserPrompt = buildUserPrompt({
      contentType: input.contentType,
      topic: input.topic,
      tone: input.tone,
      audience: input.audience,
      length: input.length,
      customWordCount: input.customWordCount,
      tolerancePercent: input.tolerancePercent,
    })
  }

  const maxTokens = getMaxTokens(input.length, input.customWordCount, input.tolerancePercent)

  return { input, agentContexts, workflowName, resolvedModelId, provider, keyRow, initialUserPrompt, maxTokens }
}

// ---------------------------------------------------------------------------
// Shared: Build agent user prompt for pipeline step
// ---------------------------------------------------------------------------

function buildAgentUserPrompt(
  index: number,
  currentInput: string,
  ctx: AgentContext,
  input: GenerateBody['input'],
  isLastAgent: boolean,
): string {
  if (index === 0) return currentInput

  return `You are continuing in a content pipeline. The previous agent produced the following content:

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

// ---------------------------------------------------------------------------
// Shared: Resolve per-agent provider and API key
// ---------------------------------------------------------------------------

async function resolveAgentProvider(
  ctx: AgentContext,
  fallbackModelId: string,
  fallbackProvider: string,
  fallbackApiKey: string,
): Promise<{ agentModelId: string; agentProvider: string; agentApiKey: string }> {
  const agentModelId: string = ctx.agent.model?.trim() || fallbackModelId
  const agentProvider: string = inferProvider(agentModelId) || fallbackProvider
  let agentApiKey = fallbackApiKey

  if (agentProvider !== fallbackProvider) {
    const agentKeyRow = await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1', [agentProvider]
    )
    if (!agentKeyRow) {
      throw new ProviderError(agentProvider, 422, `No active API key configured for ${agentProvider} (needed by agent "${ctx.agent.name}"). Add one in Settings.`)
    }
    agentApiKey = agentKeyRow.api_key
  }

  return { agentModelId, agentProvider, agentApiKey }
}

// ---------------------------------------------------------------------------
// Shared: Pipeline result type
// ---------------------------------------------------------------------------

interface AgentPipelineEntry {
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
}

// ---------------------------------------------------------------------------
// Shared: Save results to database
// ---------------------------------------------------------------------------

async function saveResults(
  setup: PipelineSetup,
  finalContent: string,
  totalInputTokens: number,
  totalCachedInputTokens: number,
  totalOutputTokens: number,
  totalCostUsd: number,
  agentPipeline: AgentPipelineEntry[],
  userId: string,
): Promise<{ historyId: string; output: Record<string, unknown>; now: string }> {
  const { input, workflowName, resolvedModelId, provider, agentContexts } = setup
  const now = new Date().toISOString()

  const metrics = calculateMetrics(finalContent)
  const tips = getTips(input.contentType)

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

  const historyId = crypto.randomUUID()
  await execute(
    'INSERT INTO history (id, user_id, input_json, output_json, workflow_name, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [historyId, userId, JSON.stringify(input), JSON.stringify(output), workflowName || null, now]
  )

  await execute(
    'INSERT INTO token_usage (id, history_id, user_id, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      crypto.randomUUID(),
      historyId,
      userId,
      provider,
      resolvedModelId,
      totalInputTokens,
      totalOutputTokens,
      totalInputTokens + totalOutputTokens,
      totalCostUsd,
      now,
    ]
  )

  // Save agent memories
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

  return { historyId, output, now }
}

// ---------------------------------------------------------------------------
// POST /api/generate — Original non-streaming endpoint (used by refine)
// ---------------------------------------------------------------------------

router.post('/', authenticate, validateBody(generateSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const setup = await preparePipeline(req, res)
  if (!setup) return

  const { input, agentContexts, resolvedModelId, provider, keyRow, initialUserPrompt, maxTokens } = setup

  try {
    let finalContent = ''
    let totalInputTokens = 0
    let totalCachedInputTokens = 0
    let totalOutputTokens = 0
    let totalCostUsd = 0
    const agentPipeline: AgentPipelineEntry[] = []

    if (agentContexts && agentContexts.length > 0) {
      let currentInput = initialUserPrompt

      for (let i = 0; i < agentContexts.length; i++) {
        const ctx = agentContexts[i]
        const isLastAgent = i === agentContexts.length - 1
        const stepType = ctx.stepType || 'text'

        const { agentModelId, agentProvider, agentApiKey } = await resolveAgentProvider(
          ctx, resolvedModelId, provider, keyRow.api_key,
        )

        let agentOutput: string
        let agentCost = 0
        let agentTokens = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 }

        if (stepType === 'image') {
          // Image step: first generate an image prompt from previous output, then generate image
          const imagePromptResponse = await callProvider({
            provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
            systemPrompt: 'You are an expert at writing image generation prompts. Output ONLY the prompt text.',
            userPrompt: buildImagePromptFromContext(currentInput, input.topic),
            maxTokens: 512,
          })

          const imageApiKey = agentApiKey // use the same key (image gen requires OpenAI key)
          const imageResult = await generateImage({
            prompt: imagePromptResponse.content.trim(),
            provider: 'openai', model: 'dall-e-3', apiKey: imageApiKey,
            size: { width: 1024, height: 1024 },
          })

          // Upload to R2 or use data URL
          const imageId = crypto.randomUUID()
          let imageUrl: string
          try {
            const r2Key = `images/pipeline/${imageId}.png`
            await uploadToR2(r2Key, imageResult.imageData, imageResult.contentType)
            imageUrl = `/api/images/${imageId}/file`
          } catch {
            imageUrl = `data:${imageResult.contentType};base64,${imageResult.imageData.toString('base64')}`
          }

          agentOutput = `![Generated Image](${imageUrl})\n\n*${imagePromptResponse.content.trim()}*`
          agentCost = 0.04 // DALL-E 3 cost for 1024x1024
          agentTokens = {
            inputTokens: imagePromptResponse.inputTokens,
            cachedInputTokens: imagePromptResponse.cachedInputTokens,
            outputTokens: imagePromptResponse.outputTokens,
            totalTokens: imagePromptResponse.totalTokens,
          }
          totalCostUsd += agentCost
          totalInputTokens += agentTokens.inputTokens
          totalCachedInputTokens += agentTokens.cachedInputTokens
          totalOutputTokens += agentTokens.outputTokens
        } else if (stepType === 'code') {
          // Code step: use code-specific system prompt
          const codeSystemPrompt = buildCodeSystemPrompt()
          const agentUserPrompt = buildAgentUserPrompt(i, currentInput, ctx, input, isLastAgent)
          const agentResponse = await callProvider({
            provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
            systemPrompt: codeSystemPrompt,
            userPrompt: agentUserPrompt,
            maxTokens: 8192,
          })

          agentOutput = agentResponse.content
          agentCost = await calculateCost(agentProvider, agentModelId, agentResponse.inputTokens, agentResponse.outputTokens, agentResponse.cachedInputTokens)
          agentTokens = {
            inputTokens: agentResponse.inputTokens,
            cachedInputTokens: agentResponse.cachedInputTokens,
            outputTokens: agentResponse.outputTokens,
            totalTokens: agentResponse.totalTokens,
          }
          totalInputTokens += agentTokens.inputTokens
          totalCachedInputTokens += agentTokens.cachedInputTokens
          totalOutputTokens += agentTokens.outputTokens
          totalCostUsd += agentCost
        } else {
          // Text step: original behavior
          const agentSystemPrompt = buildSingleAgentSystemPrompt(ctx)
          const agentUserPrompt = buildAgentUserPrompt(i, currentInput, ctx, input, isLastAgent)
          const agentResponse = await callProvider({
            provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
            systemPrompt: agentSystemPrompt,
            userPrompt: agentUserPrompt,
            maxTokens,
          })

          agentOutput = agentResponse.content
          agentCost = await calculateCost(agentProvider, agentModelId, agentResponse.inputTokens, agentResponse.outputTokens, agentResponse.cachedInputTokens)
          agentTokens = {
            inputTokens: agentResponse.inputTokens,
            cachedInputTokens: agentResponse.cachedInputTokens,
            outputTokens: agentResponse.outputTokens,
            totalTokens: agentResponse.totalTokens,
          }
          totalInputTokens += agentTokens.inputTokens
          totalCachedInputTokens += agentTokens.cachedInputTokens
          totalOutputTokens += agentTokens.outputTokens
          totalCostUsd += agentCost
        }

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
          output: agentOutput,
          tokenUsage: {
            ...agentTokens,
            costUsd: agentCost,
            model: agentModelId,
          },
        })

        currentInput = agentOutput
        finalContent = agentOutput
      }
    } else {
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
      totalCostUsd = await calculateCost(provider, resolvedModelId, aiResponse.inputTokens, aiResponse.outputTokens, aiResponse.cachedInputTokens)
    }

    const { historyId, output, now } = await saveResults(
      setup, finalContent, totalInputTokens, totalCachedInputTokens, totalOutputTokens, totalCostUsd, agentPipeline, req.user!.userId,
    )

    res.status(201).json({
      id: historyId,
      input,
      output,
      workflowName: setup.workflowName || undefined,
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

// ---------------------------------------------------------------------------
// POST /api/generate/stream — SSE streaming endpoint
// ---------------------------------------------------------------------------

function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

router.post('/stream', authenticate, validateBody(generateSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // All validation happens before SSE starts — errors return normal JSON
  const setup = await preparePipeline(req, res)
  if (!setup) return

  const { input, agentContexts, resolvedModelId, provider, keyRow, initialUserPrompt, maxTokens } = setup

  // Start SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // Handle client disconnect
  const abortController = new AbortController()
  req.on('close', () => abortController.abort())

  try {
    let finalContent = ''
    let totalInputTokens = 0
    let totalCachedInputTokens = 0
    let totalOutputTokens = 0
    let totalCostUsd = 0
    const agentPipeline: AgentPipelineEntry[] = []

    if (agentContexts && agentContexts.length > 0) {
      let currentInput = initialUserPrompt

      for (let i = 0; i < agentContexts.length; i++) {
        if (abortController.signal.aborted) break

        const ctx = agentContexts[i]
        const isLastAgent = i === agentContexts.length - 1
        const stepType = ctx.stepType || 'text'

        const { agentModelId, agentProvider, agentApiKey } = await resolveAgentProvider(
          ctx, resolvedModelId, provider, keyRow.api_key,
        )

        // Emit agent:start
        sendSSE(res, 'agent:start', {
          agentIndex: i,
          agentName: ctx.agent.name,
          agentIcon: ctx.agent.icon,
          totalAgents: agentContexts.length,
          stepType,
        })

        let agentOutput: string
        let agentCost = 0
        let agentTokens = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 }

        if (stepType === 'image') {
          // Image step: generate prompt then image (non-streaming)
          const imagePromptResponse = await callProvider({
            provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
            systemPrompt: 'You are an expert at writing image generation prompts. Output ONLY the prompt text.',
            userPrompt: buildImagePromptFromContext(currentInput, input.topic),
            maxTokens: 512,
          })

          const imageResult = await generateImage({
            prompt: imagePromptResponse.content.trim(),
            provider: 'openai', model: 'dall-e-3', apiKey: agentApiKey,
            size: { width: 1024, height: 1024 },
          })

          const imageId = crypto.randomUUID()
          let imageUrl: string
          try {
            const r2Key = `images/pipeline/${imageId}.png`
            await uploadToR2(r2Key, imageResult.imageData, imageResult.contentType)
            imageUrl = `/api/images/${imageId}/file`
          } catch {
            imageUrl = `data:${imageResult.contentType};base64,${imageResult.imageData.toString('base64')}`
          }

          agentOutput = `![Generated Image](${imageUrl})\n\n*${imagePromptResponse.content.trim()}*`
          agentCost = 0.04
          agentTokens = {
            inputTokens: imagePromptResponse.inputTokens,
            cachedInputTokens: imagePromptResponse.cachedInputTokens,
            outputTokens: imagePromptResponse.outputTokens,
            totalTokens: imagePromptResponse.totalTokens,
          }
          // Send image output as a single token event
          sendSSE(res, 'token', { chunk: agentOutput })
        } else if (stepType === 'code') {
          // Code step: use code-specific system prompt
          const codeSystemPrompt = buildCodeSystemPrompt()
          const agentUserPrompt = buildAgentUserPrompt(i, currentInput, ctx, input, isLastAgent)

          if (isLastAgent) {
            const agentResponse = await new Promise<GenerationResponse>((resolve, reject) => {
              callProviderStream({
                provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
                systemPrompt: codeSystemPrompt, userPrompt: agentUserPrompt, maxTokens: 8192,
              }, {
                onToken: (chunk) => { sendSSE(res, 'token', { chunk }) },
                onDone: (response) => resolve(response),
                signal: abortController.signal,
              }).catch(reject)
            })
            agentOutput = agentResponse.content
            agentTokens = { inputTokens: agentResponse.inputTokens, cachedInputTokens: agentResponse.cachedInputTokens, outputTokens: agentResponse.outputTokens, totalTokens: agentResponse.totalTokens }
          } else {
            const agentResponse = await callProvider({
              provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
              systemPrompt: codeSystemPrompt, userPrompt: agentUserPrompt, maxTokens: 8192,
            })
            agentOutput = agentResponse.content
            agentTokens = { inputTokens: agentResponse.inputTokens, cachedInputTokens: agentResponse.cachedInputTokens, outputTokens: agentResponse.outputTokens, totalTokens: agentResponse.totalTokens }
          }
          agentCost = await calculateCost(agentProvider, agentModelId, agentTokens.inputTokens, agentTokens.outputTokens, agentTokens.cachedInputTokens)
        } else {
          // Text step: original behavior
          const agentSystemPrompt = buildSingleAgentSystemPrompt(ctx)
          const agentUserPrompt = buildAgentUserPrompt(i, currentInput, ctx, input, isLastAgent)

          if (isLastAgent) {
            const agentResponse = await new Promise<GenerationResponse>((resolve, reject) => {
              callProviderStream({
                provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
                systemPrompt: agentSystemPrompt, userPrompt: agentUserPrompt, maxTokens,
              }, {
                onToken: (chunk) => { sendSSE(res, 'token', { chunk }) },
                onDone: (response) => resolve(response),
                signal: abortController.signal,
              }).catch(reject)
            })
            agentOutput = agentResponse.content
            agentTokens = { inputTokens: agentResponse.inputTokens, cachedInputTokens: agentResponse.cachedInputTokens, outputTokens: agentResponse.outputTokens, totalTokens: agentResponse.totalTokens }
          } else {
            const agentResponse = await callProvider({
              provider: agentProvider, model: agentModelId, apiKey: agentApiKey,
              systemPrompt: agentSystemPrompt, userPrompt: agentUserPrompt, maxTokens,
            })
            agentOutput = agentResponse.content
            agentTokens = { inputTokens: agentResponse.inputTokens, cachedInputTokens: agentResponse.cachedInputTokens, outputTokens: agentResponse.outputTokens, totalTokens: agentResponse.totalTokens }
          }
          agentCost = await calculateCost(agentProvider, agentModelId, agentTokens.inputTokens, agentTokens.outputTokens, agentTokens.cachedInputTokens)
        }

        totalInputTokens += agentTokens.inputTokens
        totalCachedInputTokens += agentTokens.cachedInputTokens
        totalOutputTokens += agentTokens.outputTokens
        totalCostUsd += agentCost

        // Emit agent:complete
        sendSSE(res, 'agent:complete', {
          agentIndex: i,
          agentName: ctx.agent.name,
          tokenUsage: {
            ...agentTokens,
            costUsd: agentCost,
            model: agentModelId,
          },
        })

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
          output: agentOutput,
          tokenUsage: {
            ...agentTokens,
            costUsd: agentCost,
            model: agentModelId,
          },
        })

        currentInput = agentOutput
        finalContent = agentOutput
      }
    } else {
      // Single agent — stream everything
      sendSSE(res, 'agent:start', {
        agentIndex: 0,
        agentName: 'ContentForge',
        agentIcon: 'Bot',
        totalAgents: 1,
      })

      const systemPrompt = buildSystemPrompt()
      const aiResponse = await new Promise<GenerationResponse>((resolve, reject) => {
        callProviderStream({
          provider,
          model: resolvedModelId,
          apiKey: keyRow.api_key,
          systemPrompt,
          userPrompt: initialUserPrompt,
          maxTokens,
        }, {
          onToken: (chunk) => {
            sendSSE(res, 'token', { chunk })
          },
          onDone: (response) => resolve(response),
          signal: abortController.signal,
        }).catch(reject)
      })

      finalContent = aiResponse.content
      totalInputTokens = aiResponse.inputTokens
      totalCachedInputTokens = aiResponse.cachedInputTokens
      totalOutputTokens = aiResponse.outputTokens
      totalCostUsd = await calculateCost(provider, resolvedModelId, aiResponse.inputTokens, aiResponse.outputTokens, aiResponse.cachedInputTokens)

      sendSSE(res, 'agent:complete', {
        agentIndex: 0,
        agentName: 'ContentForge',
        tokenUsage: {
          inputTokens: aiResponse.inputTokens,
          cachedInputTokens: aiResponse.cachedInputTokens,
          outputTokens: aiResponse.outputTokens,
          totalTokens: aiResponse.inputTokens + aiResponse.cachedInputTokens + aiResponse.outputTokens,
          costUsd: totalCostUsd,
          model: resolvedModelId,
        },
      })
    }

    if (abortController.signal.aborted) {
      res.end()
      return
    }

    // Save to database
    const { historyId, output, now } = await saveResults(
      setup, finalContent, totalInputTokens, totalCachedInputTokens, totalOutputTokens, totalCostUsd, agentPipeline, req.user!.userId,
    )

    // Emit final complete event
    sendSSE(res, 'pipeline:complete', {
      id: historyId,
      input,
      output,
      workflowName: setup.workflowName || undefined,
      createdAt: now,
    })

    res.end()
  } catch (err) {
    if (abortController.signal.aborted) {
      res.end()
      return
    }

    const message = err instanceof ProviderError
      ? err.message
      : 'Content generation failed. Please try again.'
    console.error('Stream generation error:', err)
    sendSSE(res, 'error', { message })
    res.end()
  }
})

// ---------------------------------------------------------------------------
// POST /api/generate/code — SSE streaming code generation
// ---------------------------------------------------------------------------

const CODE_SYSTEM_PROMPT = `You are an expert programmer. Generate clean, well-commented code based on the user's request.
Output ONLY code in a single fenced code block with the language specified.
Do not include any explanations, introductions, or commentary outside the code block unless the user explicitly asks for it.
The code should be production-quality, well-structured, and follow best practices for the specified language.`

router.post('/code', authenticate, validateBody(codeGenerateSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { prompt, language, context, modelId: reqModelId, provider: reqProvider } = req.body as {
    prompt: string; language: string; context?: string; modelId?: string; provider?: string
  }

  // Resolve model: use explicit model if provided, otherwise auto-route
  let modelId: string
  let provider: string
  let apiKey: string

  if (reqModelId && reqProvider && reqModelId !== 'auto' && reqProvider !== 'auto') {
    const keyRow = await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1', [reqProvider]
    )
    if (!keyRow) {
      res.status(422).json({ error: `No active API key for ${reqProvider}. Configure one in Settings.` })
      return
    }
    modelId = reqModelId
    provider = reqProvider
    apiKey = keyRow.api_key
  } else {
    try {
      const autoResult = await autoRoute('code')
      modelId = autoResult.model
      provider = autoResult.provider
      apiKey = autoResult.apiKey
    } catch {
      res.status(422).json({ error: 'No AI model available. Configure an API key in Settings.' })
      return
    }
  }

  let systemPrompt = CODE_SYSTEM_PROMPT
  if (language && language !== 'other') {
    systemPrompt += `\nThe user wants code in ${language}.`
  }
  if (context) {
    systemPrompt += `\n\nContext from the user:\n---\n${context}\n---`
  }

  const userPrompt = prompt

  // Start SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const abortController = new AbortController()
  req.on('close', () => abortController.abort())

  try {
    const aiResponse = await new Promise<GenerationResponse>((resolve, reject) => {
      callProviderStream({
        provider,
        model: modelId!,
        apiKey: apiKey!,
        systemPrompt,
        userPrompt,
        maxTokens: 8192,
      }, {
        onToken: (chunk) => {
          sendSSE(res, 'token', { chunk })
        },
        onDone: (response) => resolve(response),
        signal: abortController.signal,
      }).catch(reject)
    })

    const costUsd = await calculateCost(provider, modelId, aiResponse.inputTokens, aiResponse.outputTokens, aiResponse.cachedInputTokens)

    sendSSE(res, 'complete', {
      content: aiResponse.content,
      language,
      tokenUsage: {
        inputTokens: aiResponse.inputTokens,
        cachedInputTokens: aiResponse.cachedInputTokens,
        outputTokens: aiResponse.outputTokens,
        totalTokens: aiResponse.totalTokens,
        costUsd,
        provider,
        model: modelId,
      },
    })

    res.end()
  } catch (err) {
    if (abortController.signal.aborted) {
      res.end()
      return
    }

    const message = err instanceof ProviderError
      ? err.message
      : 'Code generation failed. Please try again.'
    console.error('Code generation error:', err)
    sendSSE(res, 'error', { message })
    res.end()
  }
})

export default router
