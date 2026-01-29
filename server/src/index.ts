import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { config } from './config.js'
import { initializeSchema } from './database/schema.js'
import { seedDatabase } from './database/seed.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
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

// Security headers - only enable strict headers in production with proper HTTPS
if (config.isProduction) {
  app.use(helmet({
    contentSecurityPolicy: false, // Configure separately based on your needs
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // Disable COOP to avoid issues with OAuth popups
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))
} else {
  // In development, only use basic security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
  }))
}

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: config.isProduction
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      }
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))

// Request logging
app.use('/api', requestLogger)

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

// Error handler for API routes only
app.use('/api', errorHandler)

// Debug endpoint to check static file paths
app.get('/debug-paths', (req, res) => {
  const publicPath = path.resolve(__dirname, '../public')
  const assetsPath = path.join(publicPath, 'assets')
  const indexPath = path.join(publicPath, 'index.html')

  res.json({
    cwd: process.cwd(),
    dirname: __dirname,
    publicPath,
    publicExists: fs.existsSync(publicPath),
    assets: fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath) : [],
    indexHtmlSnippet: fs.existsSync(indexPath)
      ? fs.readFileSync(indexPath, 'utf-8').match(/assets\/[^"']+/g)
      : null
  })
})

// Serve frontend static files in production
// Frontend is built to server/public folder
const clientDist = path.resolve(__dirname, '../public')
console.log('✓ Client dist path:', clientDist)
console.log('✓ Client dist exists:', fs.existsSync(clientDist))

// Test route for a specific asset
app.get('/test-asset', (req, res) => {
  const files = fs.readdirSync(path.join(clientDist, 'assets'))
  const jsFile = files.find(f => f.endsWith('.js') && f.startsWith('index-'))
  if (jsFile) {
    const filePath = path.join(clientDist, 'assets', jsFile)
    console.log('Serving test file:', filePath)
    res.sendFile(filePath)
  } else {
    res.status(404).send('No index JS found')
  }
})

// Serve assets manually (express.static was failing)
app.get('/assets/:filename', (req, res) => {
  const filePath = path.join(clientDist, 'assets', req.params.filename)
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Asset not found')
  }

  // Set correct MIME type
  if (req.params.filename.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  } else if (req.params.filename.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8')
  }

  res.sendFile(filePath)
})

// Serve other static files (favicon, etc)
app.get('/:filename', (req, res, next) => {
  const filePath = path.join(clientDist, req.params.filename)
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    return res.sendFile(filePath)
  }
  next()
})

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

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
