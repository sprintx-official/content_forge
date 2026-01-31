export interface GenerationRequest {
  provider: string
  model: string
  apiKey: string
  systemPrompt: string
  userPrompt: string
  maxTokens: number
}

export interface GenerationResponse {
  content: string
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  totalTokens: number
}

export class ProviderError extends Error {
  provider: string
  statusCode: number

  constructor(provider: string, statusCode: number, message: string) {
    super(message)
    this.name = 'ProviderError'
    this.provider = provider
    this.statusCode = statusCode
  }
}

async function callOpenAI(req: GenerationRequest): Promise<GenerationResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${req.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,
      max_completion_tokens: req.maxTokens,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError('openai', res.status, body.error?.message || `OpenAI returned ${res.status}`)
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[]
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
      prompt_tokens_details?: { cached_tokens?: number }
    }
  }

  const cachedTokens = data.usage.prompt_tokens_details?.cached_tokens ?? 0

  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens - cachedTokens,
    cachedInputTokens: cachedTokens,
    outputTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
  }
}

async function callAnthropic(req: GenerationRequest): Promise<GenerationResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': req.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userPrompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError('anthropic', res.status, body.error?.message || `Anthropic returned ${res.status}`)
  }

  const data = await res.json() as {
    content: { type: string; text: string }[]
    usage: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }

  const cachedTokens = (data.usage.cache_read_input_tokens ?? 0)
  const inputTokens = data.usage.input_tokens - cachedTokens
  const outputTokens = data.usage.output_tokens

  return {
    content: data.content[0].text,
    inputTokens,
    cachedInputTokens: cachedTokens,
    outputTokens,
    totalTokens: data.usage.input_tokens + outputTokens,
  }
}

async function callXAI(req: GenerationRequest): Promise<GenerationResponse> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${req.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,
      max_completion_tokens: req.maxTokens,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError('xai', res.status, body.error?.message || `xAI returned ${res.status}`)
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[]
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
      prompt_tokens_details?: { cached_tokens?: number }
    }
  }

  const cachedTokens = data.usage.prompt_tokens_details?.cached_tokens ?? 0

  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens - cachedTokens,
    cachedInputTokens: cachedTokens,
    outputTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
  }
}

async function callGoogle(req: GenerationRequest): Promise<GenerationResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${encodeURIComponent(req.apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
      generationConfig: { maxOutputTokens: req.maxTokens },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError('google', res.status, body.error?.message || `Google returned ${res.status}`)
  }

  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[]
    usageMetadata: {
      promptTokenCount: number
      candidatesTokenCount: number
      totalTokenCount: number
      cachedContentTokenCount?: number
    }
  }

  const cachedTokens = data.usageMetadata.cachedContentTokenCount ?? 0

  return {
    content: data.candidates[0].content.parts[0].text,
    inputTokens: data.usageMetadata.promptTokenCount - cachedTokens,
    cachedInputTokens: cachedTokens,
    outputTokens: data.usageMetadata.candidatesTokenCount,
    totalTokens: data.usageMetadata.totalTokenCount,
  }
}

export async function callProvider(req: GenerationRequest): Promise<GenerationResponse> {
  switch (req.provider) {
    case 'openai':
      return callOpenAI(req)
    case 'anthropic':
      return callAnthropic(req)
    case 'xai':
      return callXAI(req)
    case 'google':
      return callGoogle(req)
    default:
      throw new ProviderError(req.provider, 400, `Unsupported provider: ${req.provider}`)
  }
}

// ---------------------------------------------------------------------------
// Streaming support
// ---------------------------------------------------------------------------

export interface StreamCallbacks {
  onToken: (chunk: string) => void
  onDone: (response: GenerationResponse) => void
  signal?: AbortSignal
}

/**
 * Parse an SSE stream from a fetch Response body.
 * Yields { event?, data } for each SSE message.
 */
async function* parseSSEStream(
  body: NodeJS.ReadableStream,
): AsyncGenerator<{ event?: string; data: string }> {
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent: string | undefined

  for await (const rawChunk of body) {
    buffer += decoder.decode(rawChunk as Buffer, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        yield { event: currentEvent, data }
        currentEvent = undefined
      } else if (line.trim() === '') {
        currentEvent = undefined
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    if (buffer.startsWith('data: ') && buffer.slice(6) !== '[DONE]') {
      yield { event: currentEvent, data: buffer.slice(6) }
    }
  }
}

// --- OpenAI / xAI streaming (same protocol) ---

async function callOpenAICompatibleStream(
  endpoint: string,
  providerName: string,
  req: GenerationRequest,
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${req.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,
      max_completion_tokens: req.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
    }),
    signal: callbacks.signal,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError(providerName, res.status, body.error?.message || `${providerName} returned ${res.status}`)
  }

  let content = ''
  let inputTokens = 0
  let outputTokens = 0
  let cachedTokens = 0
  let totalTokens = 0

  for await (const { data } of parseSSEStream(res.body as unknown as NodeJS.ReadableStream)) {
    try {
      const parsed = JSON.parse(data)

      // Token chunk
      const delta = parsed.choices?.[0]?.delta?.content
      if (delta) {
        content += delta
        callbacks.onToken(delta)
      }

      // Usage info (comes in the final chunk when stream_options.include_usage is set)
      if (parsed.usage) {
        inputTokens = parsed.usage.prompt_tokens ?? 0
        cachedTokens = parsed.usage.prompt_tokens_details?.cached_tokens ?? 0
        outputTokens = parsed.usage.completion_tokens ?? 0
        totalTokens = parsed.usage.total_tokens ?? 0
        inputTokens -= cachedTokens
      }
    } catch {
      // Skip malformed JSON lines
    }
  }

  callbacks.onDone({
    content,
    inputTokens,
    cachedInputTokens: cachedTokens,
    outputTokens,
    totalTokens,
  })
}

async function callOpenAIStream(req: GenerationRequest, callbacks: StreamCallbacks): Promise<void> {
  return callOpenAICompatibleStream('https://api.openai.com/v1/chat/completions', 'openai', req, callbacks)
}

async function callXAIStream(req: GenerationRequest, callbacks: StreamCallbacks): Promise<void> {
  return callOpenAICompatibleStream('https://api.x.ai/v1/chat/completions', 'xai', req, callbacks)
}

// --- Anthropic streaming ---

async function callAnthropicStream(req: GenerationRequest, callbacks: StreamCallbacks): Promise<void> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': req.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens,
      stream: true,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userPrompt }],
    }),
    signal: callbacks.signal,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError('anthropic', res.status, body.error?.message || `Anthropic returned ${res.status}`)
  }

  let content = ''
  let inputTokens = 0
  let outputTokens = 0
  let cachedTokens = 0

  for await (const { event, data } of parseSSEStream(res.body as unknown as NodeJS.ReadableStream)) {
    try {
      const parsed = JSON.parse(data)

      if (event === 'message_start' && parsed.message?.usage) {
        inputTokens = parsed.message.usage.input_tokens ?? 0
        cachedTokens = parsed.message.usage.cache_read_input_tokens ?? 0
      } else if (event === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
        content += parsed.delta.text
        callbacks.onToken(parsed.delta.text)
      } else if (event === 'message_delta' && parsed.usage) {
        outputTokens = parsed.usage.output_tokens ?? 0
      }
    } catch {
      // Skip malformed JSON lines
    }
  }

  const totalInput = inputTokens
  inputTokens -= cachedTokens

  callbacks.onDone({
    content,
    inputTokens,
    cachedInputTokens: cachedTokens,
    outputTokens,
    totalTokens: totalInput + outputTokens,
  })
}

// --- Google streaming ---

async function callGoogleStream(req: GenerationRequest, callbacks: StreamCallbacks): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(req.apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
      generationConfig: { maxOutputTokens: req.maxTokens },
    }),
    signal: callbacks.signal,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError('google', res.status, body.error?.message || `Google returned ${res.status}`)
  }

  let content = ''
  let inputTokens = 0
  let outputTokens = 0
  let cachedTokens = 0
  let totalTokens = 0

  for await (const { data } of parseSSEStream(res.body as unknown as NodeJS.ReadableStream)) {
    try {
      const parsed = JSON.parse(data)

      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        content += text
        callbacks.onToken(text)
      }

      // Usage metadata (typically in final chunk)
      if (parsed.usageMetadata) {
        inputTokens = parsed.usageMetadata.promptTokenCount ?? 0
        outputTokens = parsed.usageMetadata.candidatesTokenCount ?? 0
        totalTokens = parsed.usageMetadata.totalTokenCount ?? 0
        cachedTokens = parsed.usageMetadata.cachedContentTokenCount ?? 0
        inputTokens -= cachedTokens
      }
    } catch {
      // Skip malformed JSON lines
    }
  }

  callbacks.onDone({
    content,
    inputTokens,
    cachedInputTokens: cachedTokens,
    outputTokens,
    totalTokens,
  })
}

// --- Streaming dispatcher ---

export async function callProviderStream(req: GenerationRequest, callbacks: StreamCallbacks): Promise<void> {
  switch (req.provider) {
    case 'openai':
      return callOpenAIStream(req, callbacks)
    case 'anthropic':
      return callAnthropicStream(req, callbacks)
    case 'xai':
      return callXAIStream(req, callbacks)
    case 'google':
      return callGoogleStream(req, callbacks)
    default:
      throw new ProviderError(req.provider, 400, `Unsupported provider: ${req.provider}`)
  }
}
