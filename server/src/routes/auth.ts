import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { queryOne } from '../database/connection.js'
import { config } from '../config.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody, loginSchema } from '../validation/index.js'
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
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

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
