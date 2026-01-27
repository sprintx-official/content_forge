import express from 'express'
import cors from 'cors'
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

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Routes
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

// Error handler
app.use(errorHandler)

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
