import type { Request, Response, NextFunction } from 'express'
import { ZodError, type ZodSchema, type ZodIssue } from 'zod'

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue: ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
}

/**
 * Middleware to validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: formatZodErrors(error),
        })
        return
      }
      next(error)
    }
  }
}

/**
 * Middleware to validate request params against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid URL parameters',
          details: formatZodErrors(error),
        })
        return
      }
      next(error)
    }
  }
}

/**
 * Middleware to validate request query against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: formatZodErrors(error),
        })
        return
      }
      next(error)
    }
  }
}
