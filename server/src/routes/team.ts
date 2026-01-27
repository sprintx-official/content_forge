import { Router, type Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getDb } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, UserRow } from '../types.js'

const router = Router()

function formatUser(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  }
}

// GET /api/team
router.get('/', authenticate, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[]
  res.json(users.map(formatUser))
})

// GET /api/team/admin-count
router.get('/admin-count', authenticate, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const result = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number }
  res.json({ count: result.count })
})

// POST /api/team
router.post('/', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { name, email, password, role } = req.body
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' })
    return
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists' })
    return
  }

  const id = crypto.randomUUID()
  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name.trim(), email.trim(), hash, role || 'user', now)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow
  res.status(201).json(formatUser(user))
})

// PATCH /api/team/:id/role
router.patch('/:id/role', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { role } = req.body
  if (!role || !['admin', 'user'].includes(role)) {
    res.status(400).json({ error: 'Valid role is required (admin or user)' })
    return
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  // Prevent removing last admin
  if (user.role === 'admin' && role === 'user') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number }
    if (adminCount.count <= 1) {
      res.status(400).json({ error: 'Cannot remove the last admin' })
      return
    }
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id)
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow
  res.json(formatUser(updated))
})

// DELETE /api/team/:id
router.delete('/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  // Prevent self-deletion
  if (req.user!.userId === req.params.id) {
    res.status(400).json({ error: 'Cannot remove yourself' })
    return
  }

  // Prevent removing last admin
  if (user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number }
    if (adminCount.count <= 1) {
      res.status(400).json({ error: 'Cannot remove the last admin' })
      return
    }
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
