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

// ---------------------------------------------------------------------------
// OpenAI (DALL-E)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Google (Imagen)
// ---------------------------------------------------------------------------

function googleAspectRatio(w: number, h: number): string {
  const ratio = w / h
  if (ratio > 1.6) return '16:9'
  if (ratio > 1.2) return '4:3'
  if (ratio < 0.65) return '9:16'
  if (ratio < 0.85) return '3:4'
  return '1:1'
}

async function generateWithGoogle(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  const model = req.model || 'imagen-3.0-generate-002'

  const res = await fetch(`${baseUrl}/models/${model}:predict`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': req.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt: req.prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: googleAspectRatio(req.size.width, req.size.height),
      },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
    const msg = body.error?.message || `Google Imagen API returned ${res.status}`
    throw new ProviderError('google', res.status, msg)
  }

  const data = await res.json() as {
    predictions?: { bytesBase64Encoded?: string; mimeType?: string }[]
  }

  const prediction = data.predictions?.[0]
  if (!prediction?.bytesBase64Encoded) {
    throw new ProviderError('google', 500, 'Imagen API returned no image data')
  }

  const imageData = Buffer.from(prediction.bytesBase64Encoded, 'base64')
  const contentType = prediction.mimeType || 'image/png'

  return {
    imageData,
    contentType,
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  switch (req.provider) {
    case 'openai':
      return generateWithOpenAI(req)
    case 'google':
      return generateWithGoogle(req)
    default:
      throw new ProviderError(req.provider, 400, `Image generation not supported for provider: ${req.provider}. Supported: OpenAI (DALL-E), Google (Imagen).`)
  }
}
