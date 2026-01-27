import { Router, type Response } from 'express'
import crypto from 'crypto'
import { getDb } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, WorkflowRow, WorkflowStepRow } from '../types.js'

const router = Router()

function formatWorkflow(row: WorkflowRow, steps: WorkflowStepRow[]) {
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
      })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getAllFormattedWorkflows() {
  const db = getDb()
  const workflows = db.prepare('SELECT * FROM workflows ORDER BY created_at ASC').all() as WorkflowRow[]
  const allSteps = db.prepare('SELECT * FROM workflow_steps ORDER BY sort_order ASC').all() as WorkflowStepRow[]

  const stepsByWorkflow = new Map<string, WorkflowStepRow[]>()
  for (const s of allSteps) {
    const arr = stepsByWorkflow.get(s.workflow_id) || []
    arr.push(s)
    stepsByWorkflow.set(s.workflow_id, arr)
  }

  return workflows.map((w) => formatWorkflow(w, stepsByWorkflow.get(w.id) || []))
}

// GET /api/workflows
router.get('/', authenticate, (_req: AuthenticatedRequest, res: Response): void => {
  res.json(getAllFormattedWorkflows())
})

// GET /api/workflows/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id) as WorkflowRow | undefined
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const steps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY sort_order ASC').all(req.params.id) as WorkflowStepRow[]
  res.json(formatWorkflow(workflow, steps))
})

// POST /api/workflows
router.post('/', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { name, description, steps, isActive } = req.body
  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  const db = getDb()
  const workflowId = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO workflows (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(workflowId, name.trim(), (description || '').trim(), isActive !== false ? 1 : 0, now, now)

  if (Array.isArray(steps)) {
    const insertStep = db.prepare(
      'INSERT INTO workflow_steps (id, workflow_id, agent_id, instructions, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    steps.forEach((step: { agentId: string; instructions: string }, i: number) => {
      insertStep.run(crypto.randomUUID(), workflowId, step.agentId, step.instructions || '', i)
    })
  }

  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflowId) as WorkflowRow
  const savedSteps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY sort_order ASC').all(workflowId) as WorkflowStepRow[]
  res.status(201).json(formatWorkflow(workflow, savedSteps))
})

// PUT /api/workflows/:id
router.put('/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id) as WorkflowRow | undefined
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const { name, description, steps, isActive } = req.body
  const now = new Date().toISOString()

  db.prepare(
    'UPDATE workflows SET name = ?, description = ?, is_active = ?, updated_at = ? WHERE id = ?'
  ).run(
    (name ?? existing.name).trim(),
    (description ?? existing.description).trim(),
    isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
    now,
    req.params.id
  )

  // Replace steps if provided
  if (Array.isArray(steps)) {
    db.prepare('DELETE FROM workflow_steps WHERE workflow_id = ?').run(req.params.id)
    const insertStep = db.prepare(
      'INSERT INTO workflow_steps (id, workflow_id, agent_id, instructions, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    steps.forEach((step: { agentId: string; instructions: string }, i: number) => {
      insertStep.run(crypto.randomUUID(), req.params.id, step.agentId, step.instructions || '', i)
    })
  }

  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id) as WorkflowRow
  const savedSteps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY sort_order ASC').all(req.params.id) as WorkflowStepRow[]
  res.json(formatWorkflow(workflow, savedSteps))
})

// PATCH /api/workflows/:id/toggle
router.patch('/:id/toggle', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id) as WorkflowRow | undefined
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const now = new Date().toISOString()
  const newActive = existing.is_active === 1 ? 0 : 1
  db.prepare('UPDATE workflows SET is_active = ?, updated_at = ? WHERE id = ?').run(newActive, now, req.params.id)

  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id) as WorkflowRow
  const steps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY sort_order ASC').all(req.params.id) as WorkflowStepRow[]
  res.json(formatWorkflow(workflow, steps))
})

// DELETE /api/workflows/:id
router.delete('/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM workflows WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
