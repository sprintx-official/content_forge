import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { queryOne, execute } from '../database/connection.js'
import { config } from '../config.js'
import { authenticate } from '../middleware/auth.js'
import { validateBody, loginSchema } from '../validation/index.js'
import type { AuthenticatedRequest, UserRow } from '../types.js'

const router = Router()

// Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// In-memory store for login attempts (in production, use Redis or database)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

function signToken(user: UserRow): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  )
}

function signRefreshToken(user: UserRow): string {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: '30d' }
  )
}

function checkAccountLocked(email: string): { locked: boolean; remainingMs?: number } {
  const attempts = loginAttempts.get(email.toLowerCase())
  if (!attempts) return { locked: false }

  if (attempts.lockedUntil > Date.now()) {
    return { locked: true, remainingMs: attempts.lockedUntil - Date.now() }
  }

  // Lockout expired, reset
  if (attempts.lockedUntil > 0) {
    loginAttempts.delete(email.toLowerCase())
  }

  return { locked: false }
}

function recordFailedAttempt(email: string): { locked: boolean; attemptsRemaining: number } {
  const key = email.toLowerCase()
  const attempts = loginAttempts.get(key) || { count: 0, lockedUntil: 0 }

  attempts.count++

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
    loginAttempts.set(key, attempts)
    return { locked: true, attemptsRemaining: 0 }
  }

  loginAttempts.set(key, attempts)
  return { locked: false, attemptsRemaining: MAX_LOGIN_ATTEMPTS - attempts.count }
}

function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase())
}

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    // Check if account is locked
    const lockStatus = checkAccountLocked(email)
    if (lockStatus.locked) {
      const remainingMinutes = Math.ceil((lockStatus.remainingMs || 0) / 60000)
      res.status(429).json({
        error: `Account temporarily locked. Try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`
      })
      return
    }

    const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email])
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      const result = recordFailedAttempt(email)
      if (result.locked) {
        res.status(429).json({
          error: 'Too many failed attempts. Account locked for 15 minutes.'
        })
      } else {
        res.status(401).json({
          error: 'Invalid email or password',
          attemptsRemaining: result.attemptsRemaining,
        })
      }
      return
    }

    // Successful login - clear any failed attempts
    clearLoginAttempts(email)

    const token = signToken(user)
    const refreshToken = signRefreshToken(user)

    res.json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at },
    })
  } catch (error) {
    const err = error as Error
    console.error('Login error:', err.message)
    console.error('Login error stack:', err.stack)
    res.status(500).json({
      error: 'Login failed. Please try again.',
      // Include error details in development only
      ...(process.env.NODE_ENV !== 'production' && { debug: err.message })
    })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' })
      return
    }

    const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string; type: string }

    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid token type' })
      return
    }

    const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [decoded.userId])
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    const token = signToken(user)
    const newRefreshToken = signRefreshToken(user)

    res.json({
      token,
      refreshToken: newRefreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at },
    })
  } catch (error) {
    // JWT verification errors
    const err = error as Error
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid or expired refresh token' })
      return
    }
    console.error('Refresh token error:', error)
    res.status(500).json({ error: 'Token refresh failed. Please try again.' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to retrieve user data' })
  }
})

export default router
