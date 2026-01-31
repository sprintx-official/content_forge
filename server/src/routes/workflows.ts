import { Router, type Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { validateBody, validateParams, createWorkflowSchema, updateWorkflowSchema, idParamSchema } from '../validation/index.js'
import type { AuthenticatedRequest, WorkflowRow, WorkflowStepRow, WorkflowAccessRow } from '../types.js'

const userIdsSchema = z.object({
  userIds: z.array(z.string().uuid()),
})

const router = Router()

function formatWorkflow(row: WorkflowRow, steps: WorkflowStepRow[], assignedUserIds?: string[]) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active === 1,
    steps: steps
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        agentId: s.agent_id,
        instructions: s.instructions,
        stepType: s.step_type || 'text',
      })),
    assignedUserIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getAllFormattedWorkflows() {
  const workflows = await query<WorkflowRow>('SELECT * FROM workflows ORDER BY created_at ASC')
  const allSteps = await query<WorkflowStepRow>('SELECT * FROM workflow_steps ORDER BY sort_order ASC')
  const allAccess = await query<WorkflowAccessRow>('SELECT * FROM workflow_access')

  const stepsByWorkflow = new Map<string, WorkflowStepRow[]>()
  for (const s of allSteps) {
    const arr = stepsByWorkflow.get(s.workflow_id) || []
    arr.push(s)
    stepsByWorkflow.set(s.workflow_id, arr)
  }

  const accessByWorkflow = new Map<string, string[]>()
  for (const a of allAccess) {
    const arr = accessByWorkflow.get(a.workflow_id) || []
    arr.push(a.user_id)
    accessByWorkflow.set(a.workflow_id, arr)
  }

  return workflows.map((w) =>
    formatWorkflow(w, stepsByWorkflow.get(w.id) || [], accessByWorkflow.get(w.id) || [])
  )
}

// GET /api/workflows
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const all = await getAllFormattedWorkflows()

  if (req.user!.role === 'admin') {
    res.json(all)
    return
  }

  // Non-admin: only return workflows the user is assigned to
  const userId = req.user!.userId
  const accessRows = await query<{ workflow_id: string }>(
    'SELECT workflow_id FROM workflow_access WHERE user_id = $1', [userId]
  )
  const allowedIds = new Set(accessRows.map((r) => r.workflow_id))
  res.json(all.filter((w) => allowedIds.has(w.id)))
})

// GET /api/workflows/:id
router.get('/:id', authenticate, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const workflow = await queryOne<WorkflowRow>(
    'SELECT * FROM workflows WHERE id = $1', [req.params.id]
  )
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  // Non-admin access check
  if (req.user!.role !== 'admin') {
    const access = await queryOne<WorkflowAccessRow>(
      'SELECT * FROM workflow_access WHERE workflow_id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    )
    if (!access) {
      res.status(403).json({ error: 'You do not have access to this workflow' })
      return
    }
  }

  const steps = await query<WorkflowStepRow>(
    'SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY sort_order ASC', [req.params.id]
  )
  const accessRows = await query<{ user_id: string }>(
    'SELECT user_id FROM workflow_access WHERE workflow_id = $1', [req.params.id]
  )
  res.json(formatWorkflow(workflow, steps, accessRows.map((r) => r.user_id)))
})

// GET /api/workflows/:id/access — admin only, returns assigned user IDs
router.get('/:id/access', authenticate, requireAdmin, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const workflow = await queryOne<WorkflowRow>(
    'SELECT id FROM workflows WHERE id = $1', [req.params.id]
  )
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const rows = await query<{ user_id: string }>(
    'SELECT user_id FROM workflow_access WHERE workflow_id = $1', [req.params.id]
  )
  res.json(rows.map((r) => r.user_id))
})

// PUT /api/workflows/:id/access — admin only, replaces all assignments
router.put('/:id/access', authenticate, requireAdmin, validateParams(idParamSchema), validateBody(userIdsSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const workflow = await queryOne<WorkflowRow>(
    'SELECT id FROM workflows WHERE id = $1', [req.params.id]
  )
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const { userIds } = req.body as { userIds: string[] }

  // Delete all existing access then insert new
  await execute('DELETE FROM workflow_access WHERE workflow_id = $1', [req.params.id])

  for (const userId of userIds) {
    await execute(
      'INSERT INTO workflow_access (id, workflow_id, user_id) VALUES ($1, $2, $3)',
      [crypto.randomUUID(), req.params.id, userId]
    )
  }

  res.json(userIds)
})

// POST /api/workflows
router.post('/', authenticate, requireAdmin, validateBody(createWorkflowSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description, steps, isActive } = req.body

  const workflowId = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute(
    'INSERT INTO workflows (id, name, description, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [workflowId, name.trim(), (description || '').trim(), isActive !== false ? 1 : 0, now, now]
  )

  if (Array.isArray(steps)) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i] as { agentId: string; instructions: string; stepType?: string }
      await execute(
        'INSERT INTO workflow_steps (id, workflow_id, agent_id, instructions, sort_order, step_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), workflowId, step.agentId, step.instructions || '', i, step.stepType || 'text']
      )
    }
  }

  const workflow = (await queryOne<WorkflowRow>(
    'SELECT * FROM workflows WHERE id = $1', [workflowId]
  ))!
  const savedSteps = await query<WorkflowStepRow>(
    'SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY sort_order ASC', [workflowId]
  )
  res.status(201).json(formatWorkflow(workflow, savedSteps, []))
})

// PUT /api/workflows/:id
router.put('/:id', authenticate, requireAdmin, validateParams(idParamSchema), validateBody(updateWorkflowSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne<WorkflowRow>(
    'SELECT * FROM workflows WHERE id = $1', [req.params.id]
  )
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const { name, description, steps, isActive } = req.body
  const now = new Date().toISOString()

  await execute(
    'UPDATE workflows SET name = $1, description = $2, is_active = $3, updated_at = $4 WHERE id = $5',
    [
      (name ?? existing.name).trim(),
      (description ?? existing.description).trim(),
      isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
      now,
      req.params.id,
    ]
  )

  // Replace steps if provided
  if (Array.isArray(steps)) {
    await execute('DELETE FROM workflow_steps WHERE workflow_id = $1', [req.params.id])
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i] as { agentId: string; instructions: string; stepType?: string }
      await execute(
        'INSERT INTO workflow_steps (id, workflow_id, agent_id, instructions, sort_order, step_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), req.params.id, step.agentId, step.instructions || '', i, step.stepType || 'text']
      )
    }
  }

  const workflow = (await queryOne<WorkflowRow>(
    'SELECT * FROM workflows WHERE id = $1', [req.params.id]
  ))!
  const savedSteps = await query<WorkflowStepRow>(
    'SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY sort_order ASC', [req.params.id]
  )
  const accessRows = await query<{ user_id: string }>(
    'SELECT user_id FROM workflow_access WHERE workflow_id = $1', [req.params.id]
  )
  res.json(formatWorkflow(workflow, savedSteps, accessRows.map((r) => r.user_id)))
})

// PATCH /api/workflows/:id/toggle
router.patch('/:id/toggle', authenticate, requireAdmin, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne<WorkflowRow>(
    'SELECT * FROM workflows WHERE id = $1', [req.params.id]
  )
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const now = new Date().toISOString()
  const newActive = existing.is_active === 1 ? 0 : 1
  await execute(
    'UPDATE workflows SET is_active = $1, updated_at = $2 WHERE id = $3',
    [newActive, now, req.params.id]
  )

  const workflow = (await queryOne<WorkflowRow>(
    'SELECT * FROM workflows WHERE id = $1', [req.params.id]
  ))!
  const steps = await query<WorkflowStepRow>(
    'SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY sort_order ASC', [req.params.id]
  )
  res.json(formatWorkflow(workflow, steps))
})

// DELETE /api/workflows/:id
router.delete('/:id', authenticate, requireAdmin, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne(
    'SELECT id FROM workflows WHERE id = $1', [req.params.id]
  )
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  await execute('DELETE FROM workflows WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

export default router
