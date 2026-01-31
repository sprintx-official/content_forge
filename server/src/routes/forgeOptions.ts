import { Router, type Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { validateBody, validateParams, idParamSchema } from '../validation/index.js'
import type { AuthenticatedRequest, ForgeOptionRow } from '../types.js'
import { invalidateForgeOptionsCache, getAllForgeOptions } from '../services/forgeOptionsCache.js'

const router = Router()

// ────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────

const createOptionSchema = z.object({
  category: z.enum(['content_type', 'tone', 'audience']),
  value: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  description: z.string().max(1000).optional().default(''),
  guidance: z.string().max(5000).optional().default(''),
  icon: z.string().max(50).optional().default(''),
  placeholder: z.string().max(500).optional().default(''),
  sortOrder: z.number().int().min(0).optional().default(0),
})

const updateOptionSchema = createOptionSchema.partial()

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatOption(row: ForgeOptionRow) {
  return {
    id: row.id,
    category: row.category,
    value: row.value,
    label: row.label,
    description: row.description,
    guidance: row.guidance,
    icon: row.icon,
    placeholder: row.placeholder,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────

// GET /api/forge-options — List all active options grouped by category
router.get('/', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const grouped = await getAllForgeOptions()
  res.json(grouped)
})

// POST /api/forge-options — Create a new option (admin only)
router.post('/', authenticate, requireAdmin, validateBody(createOptionSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, value, label, description, guidance, icon, placeholder, sortOrder } = req.body

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute(
    `INSERT INTO forge_options (id, category, value, label, description, guidance, icon, placeholder, sort_order, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11)`,
    [id, category, value, label, description, guidance, icon, placeholder, sortOrder, now, now]
  )

  const created = await queryOne<ForgeOptionRow>(
    'SELECT * FROM forge_options WHERE id = $1', [id]
  )

  invalidateForgeOptionsCache()
  res.status(201).json(formatOption(created!))
})

// PUT /api/forge-options/:id — Update an option (admin only)
router.put('/:id', authenticate, requireAdmin, validateParams(idParamSchema), validateBody(updateOptionSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params

  const existing = await queryOne<ForgeOptionRow>(
    'SELECT * FROM forge_options WHERE id = $1', [id]
  )
  if (!existing) {
    res.status(404).json({ error: 'Forge option not found' })
    return
  }

  const { category, value, label, description, guidance, icon, placeholder, sortOrder } = req.body
  const now = new Date().toISOString()

  await execute(
    `UPDATE forge_options
     SET category = $1, value = $2, label = $3, description = $4, guidance = $5,
         icon = $6, placeholder = $7, sort_order = $8, updated_at = $9
     WHERE id = $10`,
    [
      category ?? existing.category,
      value ?? existing.value,
      label ?? existing.label,
      description ?? existing.description,
      guidance ?? existing.guidance,
      icon ?? existing.icon,
      placeholder ?? existing.placeholder,
      sortOrder ?? existing.sort_order,
      now,
      id,
    ]
  )

  const updated = await queryOne<ForgeOptionRow>(
    'SELECT * FROM forge_options WHERE id = $1', [id]
  )

  invalidateForgeOptionsCache()
  res.json(formatOption(updated!))
})

// DELETE /api/forge-options/:id — Hard delete an option (admin only)
router.delete('/:id', authenticate, requireAdmin, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params

  const existing = await queryOne<ForgeOptionRow>(
    'SELECT * FROM forge_options WHERE id = $1', [id]
  )
  if (!existing) {
    res.status(404).json({ error: 'Forge option not found' })
    return
  }

  await execute('DELETE FROM forge_options WHERE id = $1', [id])

  invalidateForgeOptionsCache()
  res.json({ success: true })
})

export default router
