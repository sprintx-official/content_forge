import { Router, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { subscribe, unsubscribe, type AppEvent } from '../services/events.js'
import type { AuthenticatedRequest, JwtPayload } from '../types.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/events — Server-Sent Events stream for real-time updates
// Supports auth via Authorization header OR ?token= query param
// (EventSource API doesn't support custom headers)
// ---------------------------------------------------------------------------
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  // Authenticate via header or query param
  const header = req.headers.authorization
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null
  const token = header?.startsWith('Bearer ') ? header.slice(7) : queryToken

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
    req.user = payload
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable Nginx buffering
  res.flushHeaders()

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`)

  // Keepalive ping every 30 seconds
  const keepalive = setInterval(() => {
    res.write(`: keepalive\n\n`)
  }, 30000)

  // Subscribe to events
  const handler = (event: AppEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    } catch {
      // Client disconnected
    }
  }

  subscribe(handler).catch((err) => {
    console.error('[SSE] Failed to subscribe:', err)
  })

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepalive)
    unsubscribe(handler)
  })
})

export default router
