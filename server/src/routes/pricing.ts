import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, ModelPricingRow } from '../types.js'

const router = Router()

const VALID_PROVIDERS = ['openai', 'anthropic', 'xai', 'google']

function formatPricing(row: ModelPricingRow) {
  return {
    id: row.id,
    provider: row.provider,
    modelPattern: row.model_pattern,
    inputPricePerMillion: row.input_price_per_million,
    cachedInputPricePerMillion: row.cached_input_price_per_million,
    outputPricePerMillion: row.output_price_per_million,
    updatedAt: row.updated_at,
  }
}

// GET /api/pricing — List all pricing
router.get('/', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const rows = await query<ModelPricingRow>('SELECT * FROM model_pricing ORDER BY provider ASC, model_pattern ASC')
  res.json(rows.map(formatPricing))
})

// POST /api/pricing — Create new pricing entry
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { provider, modelPattern, inputPricePerMillion, cachedInputPricePerMillion, outputPricePerMillion } = req.body

  if (!provider || !modelPattern) {
    res.status(400).json({ error: 'Provider and modelPattern are required' })
    return
  }
  if (!VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` })
    return
  }
  if (typeof inputPricePerMillion !== 'number' || typeof outputPricePerMillion !== 'number') {
    res.status(400).json({ error: 'inputPricePerMillion and outputPricePerMillion must be numbers' })
    return
  }

  // Check for duplicate
  const existing = await queryOne<ModelPricingRow>(
    'SELECT * FROM model_pricing WHERE provider = $1 AND model_pattern = $2',
    [provider, modelPattern]
  )
  if (existing) {
    res.status(409).json({ error: 'Pricing entry already exists for this provider and model pattern' })
    return
  }

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const cachedPrice = typeof cachedInputPricePerMillion === 'number' ? cachedInputPricePerMillion : 0

  await execute(
    'INSERT INTO model_pricing (id, provider, model_pattern, input_price_per_million, cached_input_price_per_million, output_price_per_million, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, provider, modelPattern, inputPricePerMillion, cachedPrice, outputPricePerMillion, now]
  )

  const created = await queryOne<ModelPricingRow>('SELECT * FROM model_pricing WHERE id = $1', [id])
  res.status(201).json(formatPricing(created!))
})

// PATCH /api/pricing/:id — Update pricing entry
router.patch('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string
  const { provider, modelPattern, inputPricePerMillion, cachedInputPricePerMillion, outputPricePerMillion } = req.body

  const existing = await queryOne<ModelPricingRow>('SELECT * FROM model_pricing WHERE id = $1', [id])
  if (!existing) {
    res.status(404).json({ error: 'Pricing entry not found' })
    return
  }

  if (provider && !VALID_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` })
    return
  }

  const now = new Date().toISOString()
  const updates: string[] = []
  const values: (string | number)[] = []
  let paramIndex = 1

  if (provider !== undefined) {
    updates.push(`provider = $${paramIndex++}`)
    values.push(provider)
  }
  if (modelPattern !== undefined) {
    updates.push(`model_pattern = $${paramIndex++}`)
    values.push(modelPattern)
  }
  if (inputPricePerMillion !== undefined) {
    updates.push(`input_price_per_million = $${paramIndex++}`)
    values.push(inputPricePerMillion)
  }
  if (cachedInputPricePerMillion !== undefined) {
    updates.push(`cached_input_price_per_million = $${paramIndex++}`)
    values.push(cachedInputPricePerMillion)
  }
  if (outputPricePerMillion !== undefined) {
    updates.push(`output_price_per_million = $${paramIndex++}`)
    values.push(outputPricePerMillion)
  }

  updates.push(`updated_at = $${paramIndex++}`)
  values.push(now)
  values.push(id)

  await execute(
    `UPDATE model_pricing SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  )

  const updated = await queryOne<ModelPricingRow>('SELECT * FROM model_pricing WHERE id = $1', [id])
  res.json(formatPricing(updated!))
})

// DELETE /api/pricing/:id — Delete pricing entry
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string

  const existing = await queryOne('SELECT id FROM model_pricing WHERE id = $1', [id])
  if (!existing) {
    res.status(404).json({ error: 'Pricing entry not found' })
    return
  }

  await execute('DELETE FROM model_pricing WHERE id = $1', [id])
  res.json({ success: true })
})

export default router
