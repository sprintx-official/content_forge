import { Router, type Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import type { AuthenticatedRequest, UserRow } from '../types.js'

const router = Router()

const SUPER_ADMIN_EMAIL = 'admin@contentforge.com'

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
router.get('/', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const users = await query<UserRow>('SELECT * FROM users ORDER BY created_at ASC')
  res.json(users.map(formatUser))
})

// GET /api/team/admin-count
router.get('/admin-count', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = (await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"))!
  res.json({ count: result.count })
})

// POST /api/team
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' })
    return
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists' })
    return
  }

  const id = crypto.randomUUID()
  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()

  await execute(
    'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, name.trim(), email.trim(), hash, role || 'user', now]
  )

  const user = (await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]))!
  res.status(201).json(formatUser(user))
})

// PATCH /api/team/:id/role
router.patch('/:id/role', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { role } = req.body
  if (!role || !['admin', 'user'].includes(role)) {
    res.status(400).json({ error: 'Valid role is required (admin or user)' })
    return
  }

  const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id])
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  // Prevent demoting super admin
  if (user.email === SUPER_ADMIN_EMAIL) {
    res.status(403).json({ error: 'Cannot change the role of the super admin' })
    return
  }

  // Prevent removing last admin
  if (user.role === 'admin' && role === 'user') {
    const adminCount = (await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"))!
    if (adminCount.count <= 1) {
      res.status(400).json({ error: 'Cannot remove the last admin' })
      return
    }
  }

  await execute('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id])
  const updated = (await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id]))!
  res.json(formatUser(updated))
})

// DELETE /api/team/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id])
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  // Prevent deleting super admin
  if (user.email === SUPER_ADMIN_EMAIL) {
    res.status(403).json({ error: 'Cannot delete the super admin' })
    return
  }

  // Prevent self-deletion
  if (req.user!.userId === req.params.id) {
    res.status(400).json({ error: 'Cannot remove yourself' })
    return
  }

  // Prevent removing last admin
  if (user.role === 'admin') {
    const adminCount = (await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"))!
    if (adminCount.count <= 1) {
      res.status(400).json({ error: 'Cannot remove the last admin' })
      return
    }
  }

  await execute('DELETE FROM users WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

export default router
