import { Router, type Response } from 'express'
import crypto from 'crypto'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { validateBody, validateParams, createAgentSchema, updateAgentSchema, idParamSchema } from '../validation/index.js'
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
router.get('/', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agents = await query<AgentRow>('SELECT * FROM agents ORDER BY created_at ASC')
  const files = await query<AgentFileRow>('SELECT * FROM agent_files ORDER BY uploaded_at ASC')

  const filesByAgent = new Map<string, AgentFileRow[]>()
  for (const f of files) {
    const arr = filesByAgent.get(f.agent_id) || []
    arr.push(f)
    filesByAgent.set(f.agent_id, arr)
  }

  res.json(agents.map((a) => formatAgent(a, filesByAgent.get(a.id) || [])))
})

// GET /api/agents/:id
router.get('/:id', authenticate, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const agent = await queryOne<AgentRow>(
    'SELECT * FROM agents WHERE id = $1', [req.params.id]
  )
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const files = await query<AgentFileRow>(
    'SELECT * FROM agent_files WHERE agent_id = $1 ORDER BY uploaded_at ASC', [agent.id]
  )
  res.json(formatAgent(agent, files))
})

// GET /api/agents/:id/in-use
router.get('/:id/in-use', authenticate, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const step = await queryOne(
    'SELECT id FROM workflow_steps WHERE agent_id = $1 LIMIT 1', [req.params.id]
  )
  res.json({ inUse: !!step })
})

// POST /api/agents
router.post('/', authenticate, requireAdmin, validateBody(createAgentSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description, systemPrompt, knowledgeBase, icon, model } = req.body

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute(
    'INSERT INTO agents (id, name, description, system_prompt, knowledge_base, icon, model, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [id, name.trim(), (description || '').trim(), (systemPrompt || '').trim(), (knowledgeBase || '').trim(), icon || 'Brain', (model || '').trim(), now, now]
  )

  const agent = (await queryOne<AgentRow>('SELECT * FROM agents WHERE id = $1', [id]))!
  const files = await query<AgentFileRow>('SELECT * FROM agent_files WHERE agent_id = $1', [id])
  res.status(201).json(formatAgent(agent, files))
})

// PUT /api/agents/:id
router.put('/:id', authenticate, requireAdmin, validateParams(idParamSchema), validateBody(updateAgentSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne<AgentRow>(
    'SELECT * FROM agents WHERE id = $1', [req.params.id]
  )
  if (!existing) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const { name, description, systemPrompt, knowledgeBase, icon, model } = req.body
  const now = new Date().toISOString()

  await execute(
    'UPDATE agents SET name = $1, description = $2, system_prompt = $3, knowledge_base = $4, icon = $5, model = $6, updated_at = $7 WHERE id = $8',
    [
      (name ?? existing.name).trim(),
      (description ?? existing.description).trim(),
      (systemPrompt ?? existing.system_prompt).trim(),
      (knowledgeBase ?? existing.knowledge_base).trim(),
      icon ?? existing.icon,
      (model ?? existing.model).trim(),
      now,
      req.params.id,
    ]
  )

  const agent = (await queryOne<AgentRow>('SELECT * FROM agents WHERE id = $1', [req.params.id]))!
  const files = await query<AgentFileRow>(
    'SELECT * FROM agent_files WHERE agent_id = $1 ORDER BY uploaded_at ASC', [req.params.id]
  )
  res.json(formatAgent(agent, files))
})

// DELETE /api/agents/:id
router.delete('/:id', authenticate, requireAdmin, validateParams(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await queryOne('SELECT id FROM agents WHERE id = $1', [req.params.id])
  if (!existing) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  // CASCADE will remove agent_files
  await execute('DELETE FROM agents WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

export default router
