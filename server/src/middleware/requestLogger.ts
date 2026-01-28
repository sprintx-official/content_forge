import type { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

interface LogEntry {
  timestamp: string
  method: string
  path: string
  statusCode: number
  responseTime: number
  ip: string
  userAgent: string
  userId?: string
  contentLength?: number
}

/**
 * Simple request logger middleware.
 * In production, you'd want to send these to a proper logging service.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()

  // Capture the original end function
  const originalEnd = res.end.bind(res)

  // Override end to log after response is sent
  res.end = function (chunk?: unknown, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
    const responseTime = Date.now() - startTime

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      userId: (req as { user?: { userId: string } }).user?.userId,
      contentLength: res.get('content-length') ? parseInt(res.get('content-length')!, 10) : undefined,
    }

    // Log format: [timestamp] METHOD /path STATUS TIMEms (userId)
    const userInfo = logEntry.userId ? ` user:${logEntry.userId.slice(0, 8)}` : ''
    const statusColor = logEntry.statusCode >= 500 ? '\x1b[31m' : // red
                        logEntry.statusCode >= 400 ? '\x1b[33m' : // yellow
                        logEntry.statusCode >= 300 ? '\x1b[36m' : // cyan
                        '\x1b[32m' // green

    if (!config.isProduction) {
      console.log(
        `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.path} ${statusColor}${logEntry.statusCode}\x1b[0m ${logEntry.responseTime}ms${userInfo}`
      )
    } else {
      // In production, log as JSON for easier parsing
      console.log(JSON.stringify(logEntry))
    }

    // Call original end
    if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding)
    }
    return originalEnd(chunk, encoding as BufferEncoding, callback)
  } as typeof res.end

  next()
}

/**
 * Audit logger for sensitive operations.
 * Call this in route handlers for important actions.
 */
export function auditLog(
  action: string,
  userId: string | undefined,
  details: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    type: 'AUDIT',
    action,
    userId: userId || 'anonymous',
    details,
  }

  if (config.isProduction) {
    console.log(JSON.stringify(entry))
  } else {
    console.log(`[AUDIT] ${action} by ${entry.userId}:`, details)
  }
}
