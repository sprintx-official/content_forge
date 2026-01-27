import { Router, type Response } from 'express'
import crypto from 'crypto'
import { getDb } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, AgentRow, AgentFileRow } from '../types.js'

const router = Router()

function formatAgent(agent: AgentRow, files: AgentFileRow[]) {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    systemPrompt: agent.system_prompt,
    knowledgeBase: agent.knowledge_base,
    icon: agent.icon,
    model: agent.model,
    knowledgeBaseFiles: files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      r2Key: f.r2_key,
      contentText: f.content_text,
      uploadedAt: f.uploaded_at,
    })),
    createdAt: agent.created_at,
    updatedAt: agent.updated_at,
  }
}

// GET /api/agents
router.get('/', authenticate, (_req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const agents = db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all() as AgentRow[]
  const files = db.prepare('SELECT * FROM agent_files ORDER BY uploaded_at ASC').all() as AgentFileRow[]

  const filesByAgent = new Map<string, AgentFileRow[]>()
  for (const f of files) {
    const arr = filesByAgent.get(f.agent_id) || []
    arr.push(f)
    filesByAgent.set(f.agent_id, arr)
  }

  res.json(agents.map((a) => formatAgent(a, filesByAgent.get(a.id) || [])))
})

// GET /api/agents/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow | undefined
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const files = db.prepare('SELECT * FROM agent_files WHERE agent_id = ? ORDER BY uploaded_at ASC').all(agent.id) as AgentFileRow[]
  res.json(formatAgent(agent, files))
})

// GET /api/agents/:id/in-use
router.get('/:id/in-use', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const step = db.prepare('SELECT id FROM workflow_steps WHERE agent_id = ? LIMIT 1').get(req.params.id)
  res.json({ inUse: !!step })
})

// POST /api/agents
router.post('/', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { name, description, systemPrompt, knowledgeBase, icon, model } = req.body
  if (!name || !description) {
    res.status(400).json({ error: 'Name and description are required' })
    return
  }

  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO agents (id, name, description, system_prompt, knowledge_base, icon, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name.trim(), (description || '').trim(), (systemPrompt || '').trim(), (knowledgeBase || '').trim(), icon || 'Brain', (model || '').trim(), now, now)

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRow
  const files = db.prepare('SELECT * FROM agent_files WHERE agent_id = ?').all(id) as AgentFileRow[]
  res.status(201).json(formatAgent(agent, files))
})

// PUT /api/agents/:id
router.put('/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow | undefined
  if (!existing) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const { name, description, systemPrompt, knowledgeBase, icon, model } = req.body
  const now = new Date().toISOString()

  db.prepare(
    'UPDATE agents SET name = ?, description = ?, system_prompt = ?, knowledge_base = ?, icon = ?, model = ?, updated_at = ? WHERE id = ?'
  ).run(
    (name ?? existing.name).trim(),
    (description ?? existing.description).trim(),
    (systemPrompt ?? existing.system_prompt).trim(),
    (knowledgeBase ?? existing.knowledge_base).trim(),
    icon ?? existing.icon,
    (model ?? existing.model).trim(),
    now,
    req.params.id
  )

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow
  const files = db.prepare('SELECT * FROM agent_files WHERE agent_id = ? ORDER BY uploaded_at ASC').all(req.params.id) as AgentFileRow[]
  res.json(formatAgent(agent, files))
})

// DELETE /api/agents/:id
router.delete('/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  // CASCADE will remove agent_files
  db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
