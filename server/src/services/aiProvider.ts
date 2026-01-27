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
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }

  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
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
    usage: { input_tokens: number; output_tokens: number }
  }

  const inputTokens = data.usage.input_tokens
  const outputTokens = data.usage.output_tokens

  return {
    content: data.content[0].text,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
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
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }

  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
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
    usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number }
  }

  return {
    content: data.candidates[0].content.parts[0].text,
    inputTokens: data.usageMetadata.promptTokenCount,
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
