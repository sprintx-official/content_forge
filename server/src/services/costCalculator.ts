import { query } from '../database/connection.js'
import type { ModelPricingRow } from '../types.js'

export async function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): Promise<number> {
  const rows = await query<ModelPricingRow>(
    'SELECT * FROM model_pricing WHERE provider = $1', [provider]
  )

  if (rows.length === 0) return 0

  // Find the longest matching model_pattern prefix
  let bestMatch: ModelPricingRow | null = null
  let bestLen = 0

  for (const row of rows) {
    if (model.startsWith(row.model_pattern) && row.model_pattern.length > bestLen) {
      bestMatch = row
      bestLen = row.model_pattern.length
    }
  }

  if (!bestMatch) return 0

  const inputCost = (inputTokens / 1_000_000) * bestMatch.input_price_per_million
  const cachedInputCost = (cachedInputTokens / 1_000_000) * bestMatch.cached_input_price_per_million
  const outputCost = (outputTokens / 1_000_000) * bestMatch.output_price_per_million

  return Math.round((inputCost + cachedInputCost + outputCost) * 1_000_000) / 1_000_000
}
