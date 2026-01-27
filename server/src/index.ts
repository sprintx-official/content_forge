import express from 'express'
import cors from 'cors'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/keys', apiKeyRoutes)
app.use('/api/generate', generateRoutes)
app.use('/api/memory', memoryRoutes)

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
