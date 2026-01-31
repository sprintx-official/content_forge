import { ProviderError } from './aiProvider.js'

export interface ImageGenerationRequest {
  prompt: string
  provider: string
  model: string
  apiKey: string
  size: { width: number; height: number }
  style?: string
}

export interface ImageGenerationResponse {
  imageData: Buffer
  revisedPrompt?: string
  contentType: string
}

function openAISize(w: number, h: number): string {
  if (w === 1792 && h === 1024) return '1792x1024'
  if (w === 1024 && h === 1792) return '1024x1792'
  return '1024x1024'
}

async function generateWithOpenAI(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${req.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,
      prompt: req.prompt,
      n: 1,
      size: openAISize(req.size.width, req.size.height),
      response_format: 'b64_json',
      style: req.style === 'vivid' ? 'vivid' : 'natural',
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new ProviderError('openai', res.status, body.error?.message || `OpenAI Image API returned ${res.status}`)
  }

  const data = await res.json() as {
    data: { b64_json: string; revised_prompt?: string }[]
  }

  const imageB64 = data.data[0].b64_json
  const imageData = Buffer.from(imageB64, 'base64')

  return {
    imageData,
    revisedPrompt: data.data[0].revised_prompt,
    contentType: 'image/png',
  }
}

export async function generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  switch (req.provider) {
    case 'openai':
      return generateWithOpenAI(req)
    default:
      throw new ProviderError(req.provider, 400, `Image generation not supported for provider: ${req.provider}. Currently only OpenAI (DALL-E) is supported.`)
  }
}
