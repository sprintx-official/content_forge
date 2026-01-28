import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { config } from './config.js'
import { initializeSchema } from './database/schema.js'
import { seedDatabase } from './database/seed.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import agentRoutes from './routes/agents.js'
import workflowRoutes from './routes/workflows.js'
import feedbackRoutes from './routes/feedback.js'
import historyRoutes from './routes/history.js'
import fileRoutes from './routes/files.js'
import teamRoutes from './routes/team.js'
import apiKeyRoutes from './routes/apiKeys.js'
import generateRoutes from './routes/generate.js'
import memoryRoutes from './routes/memory.js'
import pricingRoutes from './routes/pricing.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true, // Don't count successful logins
})

const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 generations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation rate limit exceeded, please wait before generating more content' },
})

// Apply general rate limiter to all API routes
app.use('/api', generalLimiter)

// API routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/keys', apiKeyRoutes)
app.use('/api/generate', generateLimiter, generateRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/pricing', pricingRoutes)

// Error handler for API routes
app.use(errorHandler)

// Serve frontend static files in production
const clientDist = path.resolve(__dirname, '../../dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

async function startServer() {
  await initializeSchema()
  await seedDatabase()

  app.listen(config.port, () => {
    console.log(`ContentForge server running on http://localhost:${config.port}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
