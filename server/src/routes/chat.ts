import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody } from '../validation/middleware.js'
import { sendMessageSchema, createConversationSchema } from '../validation/chatSchemas.js'
import { callProviderStream, ProviderError, type GenerationResponse } from '../services/aiProvider.js'
import { calculateCost } from '../services/costCalculator.js'
import { autoRoute } from '../services/autoRouter.js'
import type { AuthenticatedRequest, ChatConversationRow, ChatMessageRow, ApiKeyRow } from '../types.js'

const router = Router()

const CHAT_SYSTEM_PROMPT = 'You are a helpful AI assistant. Be concise and direct.'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveModel(reqModelId?: string, reqProvider?: string): Promise<{ modelId: string; provider: string; apiKey: string }> {
  // Use explicit model if provided
  if (reqModelId && reqProvider && reqModelId !== 'auto' && reqProvider !== 'auto') {
    const keyRow = await queryOne<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1',
      [reqProvider],
    )
    if (!keyRow) {
      throw new ProviderError(reqProvider, 422, `No active API key for ${reqProvider}. Configure one in Settings.`)
    }
    return { modelId: reqModelId, provider: reqProvider, apiKey: keyRow.api_key }
  }

  // Fall back to auto-routing
  try {
    const result = await autoRoute('text-chat')
    return { modelId: result.model, provider: result.provider, apiKey: result.apiKey }
  } catch (err) {
    throw new ProviderError('none', 422, err instanceof Error ? err.message : 'No AI model available. Configure an API key in Settings.')
  }
}

function buildMessages(
  history: ChatMessageRow[],
  userContent: string,
  context?: string,
): { systemPrompt: string; userPrompt: string } {
  let systemPrompt = CHAT_SYSTEM_PROMPT
  if (context) {
    systemPrompt += `\n\nThe user is asking about the following content:\n---\n${context}\n---`
  }

  // Build conversation history into the user prompt
  const parts: string[] = []
  for (const msg of history) {
    parts.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
  }
  parts.push(`User: ${userContent}`)

  return { systemPrompt, userPrompt: parts.join('\n\n') }
}

// ---------------------------------------------------------------------------
// GET /api/chat/conversations — List conversations
// ---------------------------------------------------------------------------

router.get('/conversations', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const offset = parseInt(req.query.offset as string) || 0

  const conversations = await query<ChatConversationRow>(
    'SELECT * FROM chat_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  )

  res.json({ data: conversations })
})

// ---------------------------------------------------------------------------
// POST /api/chat/conversations — Create conversation
// ---------------------------------------------------------------------------

router.post('/conversations', authenticate, validateBody(createConversationSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { title } = req.body as { title?: string }
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await execute(
    'INSERT INTO chat_conversations (id, user_id, title, last_message, message_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, userId, title || 'New Chat', '', 0, now, now]
  )

  const conv = await queryOne<ChatConversationRow>(
    'SELECT * FROM chat_conversations WHERE id = $1', [id]
  )

  res.status(201).json(conv)
})

// ---------------------------------------------------------------------------
// GET /api/chat/conversations/:id — Get conversation + messages
// ---------------------------------------------------------------------------

router.get('/conversations/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const conv = await queryOne<ChatConversationRow>(
    'SELECT * FROM chat_conversations WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' })
    return
  }

  const messages = await query<ChatMessageRow>(
    'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conv.id]
  )

  res.json({ conversation: conv, messages })
})

// ---------------------------------------------------------------------------
// DELETE /api/chat/conversations/:id
// ---------------------------------------------------------------------------

router.delete('/conversations/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const conv = await queryOne<ChatConversationRow>(
    'SELECT * FROM chat_conversations WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' })
    return
  }

  await execute('DELETE FROM chat_conversations WHERE id = $1', [conv.id])
  res.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/:id/stream — Send message + SSE stream response
// ---------------------------------------------------------------------------

router.post('/conversations/:id/stream', authenticate, validateBody(sendMessageSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { content, context, modelId: reqModelId, provider: reqProvider } = req.body as {
    content: string
    context?: string
    modelId?: string
    provider?: string
  }

  const conv = await queryOne<ChatConversationRow>(
    'SELECT * FROM chat_conversations WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  )

  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' })
    return
  }

  // Resolve model
  let modelId: string
  let provider: string
  let apiKey: string
  try {
    const resolved = await resolveModel(reqModelId, reqProvider)
    modelId = resolved.modelId
    provider = resolved.provider
    apiKey = resolved.apiKey
  } catch (err) {
    if (err instanceof ProviderError) {
      res.status(err.statusCode).json({ error: err.message })
      return
    }
    throw err
  }

  // Save user message
  const userMsgId = crypto.randomUUID()
  const userNow = new Date().toISOString()
  await execute(
    'INSERT INTO chat_messages (id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, $5)',
    [userMsgId, conv.id, 'user', content, userNow]
  )

  // Get conversation history (last 20 messages for context window)
  const history = await query<ChatMessageRow>(
    'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20',
    [conv.id]
  )
  // Reverse to chronological order, exclude the just-added user message from history
  // (we already include it via userPrompt)
  const previousMessages = history.reverse().slice(0, -1)

  const { systemPrompt, userPrompt } = buildMessages(previousMessages, content, context)

  // Start SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const abortController = new AbortController()
  req.on('close', () => abortController.abort())

  // Emit user message ID
  res.write(`event: user_message\ndata: ${JSON.stringify({ id: userMsgId })}\n\n`)

  try {
    const aiResponse = await new Promise<GenerationResponse>((resolve, reject) => {
      callProviderStream({
        provider,
        model: modelId,
        apiKey,
        systemPrompt,
        userPrompt,
        maxTokens: 4096,
      }, {
        onToken: (chunk) => {
          res.write(`event: token\ndata: ${JSON.stringify({ chunk })}\n\n`)
        },
        onDone: (response) => resolve(response),
        signal: abortController.signal,
      }).catch(reject)
    })

    const costUsd = await calculateCost(provider, modelId, aiResponse.inputTokens, aiResponse.outputTokens, aiResponse.cachedInputTokens)

    // Save assistant message
    const assistantMsgId = crypto.randomUUID()
    const assistantNow = new Date().toISOString()
    await execute(
      `INSERT INTO chat_messages (id, conversation_id, role, content, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [assistantMsgId, conv.id, 'assistant', aiResponse.content, modelId, provider,
       aiResponse.inputTokens, aiResponse.outputTokens, aiResponse.totalTokens, costUsd, assistantNow]
    )

    // Auto-title from first message
    const isFirstMessage = conv.message_count === 0
    const newTitle = isFirstMessage ? content.slice(0, 100) : conv.title

    // Update conversation
    await execute(
      'UPDATE chat_conversations SET title = $1, last_message = $2, message_count = message_count + 2, updated_at = $3 WHERE id = $4',
      [newTitle, aiResponse.content.slice(0, 200), assistantNow, conv.id]
    )

    // Emit complete
    res.write(`event: complete\ndata: ${JSON.stringify({
      id: assistantMsgId,
      content: aiResponse.content,
      model: modelId,
      provider,
      tokenUsage: {
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        totalTokens: aiResponse.totalTokens,
        costUsd,
      },
    })}\n\n`)

    res.end()
  } catch (err) {
    if (abortController.signal.aborted) {
      res.end()
      return
    }

    const message = err instanceof ProviderError
      ? err.message
      : 'Chat failed. Please try again.'
    console.error('Chat stream error:', err)
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
    res.end()
  }
})

export default router
