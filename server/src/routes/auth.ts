import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { queryOne, execute } from '../database/connection.js'
import { config } from '../config.js'
import { authenticate } from '../middleware/auth.js'
import type { AuthenticatedRequest, UserRow } from '../types.js'

const router = Router()

function signToken(user: UserRow): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email])
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = signToken(user)
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at },
  })
})

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' })
    return
  }

  const id = crypto.randomUUID()
  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()

  await execute(
    'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, name.trim(), email.trim(), hash, 'user', now]
  )

  const user = (await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]))!
  const token = signToken(user)

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at },
  })
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.userId])
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  })
})

export default router
