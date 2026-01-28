import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { config } from '../config.js'

/**
 * Custom error class for API errors with status codes
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string[]
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static badRequest(message: string, details?: string[]): ApiError {
    return new ApiError(400, message, details)
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message)
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message)
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message)
  }

  static unprocessable(message: string): ApiError {
    return new ApiError(422, message)
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(429, message)
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message)
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    res.status(400).json({
      error: 'Validation failed',
      details: messages,
    })
    return
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    })
    return
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token' })
    return
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired' })
    return
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON in request body' })
    return
  }

  // Log unexpected errors (only show stack in development)
  console.error('Unhandled error:', err.message)
  if (!config.isProduction) {
    console.error(err.stack)
  }

  // Generic error response (don't leak error details in production)
  res.status(500).json({
    error: config.isProduction ? 'Internal server error' : err.message,
  })
}
