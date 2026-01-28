import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// Password must be at least 8 characters with at least one uppercase, one lowercase, one number
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
})

// Generate schemas
export const generateInputSchema = z.object({
  contentType: z.enum(['article', 'blog', 'social', 'press', 'script', 'ad-copy']),
  topic: z.string().min(1, 'Topic is required').max(1000, 'Topic too long'),
  tone: z.enum(['professional', 'casual', 'persuasive', 'informative', 'inspirational']),
  audience: z.enum(['general', 'students', 'professionals', 'youth', 'seniors']),
  length: z.enum(['short', 'medium', 'long', 'custom']),
  customWordCount: z.number().int().min(10).max(10000).optional(),
  tolerancePercent: z.number().int().min(0).max(100).optional(),
  workflowId: z.string().uuid().optional(),
})

export const generateSchema = z.object({
  input: generateInputSchema,
  workflowId: z.string().uuid().optional(),
})

// Agent schemas
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().default(''),
  systemPrompt: z.string().max(10000, 'System prompt too long').optional().default(''),
  knowledgeBase: z.string().max(50000, 'Knowledge base too long').optional().default(''),
  icon: z.string().max(50, 'Icon name too long').optional().default('Bot'),
  model: z.string().max(100, 'Model name too long').optional().default(''),
})

export const updateAgentSchema = createAgentSchema.partial()

// Workflow schemas
export const workflowStepSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID'),
  instructions: z.string().max(2000, 'Instructions too long').optional().default(''),
})

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().default(''),
  steps: z.array(workflowStepSchema).min(1, 'At least one step is required').max(20, 'Too many steps'),
  isActive: z.boolean().optional().default(true),
  assignedUserIds: z.array(z.string().uuid()).optional(),
})

export const updateWorkflowSchema = createWorkflowSchema.partial()

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  role: z.enum(['admin', 'user']).optional().default('user'),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: passwordSchema.optional(),
  role: z.enum(['admin', 'user']).optional(),
})

// Feedback schema
export const createFeedbackSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  text: z.string().max(2000, 'Feedback too long').optional().default(''),
})

// API Key schemas
export const createApiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'xai', 'google']),
  apiKey: z.string().min(10, 'API key too short').max(500, 'API key too long'),
})

// Pricing schemas
export const createPricingSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'xai', 'google']),
  modelPattern: z.string().min(1, 'Model pattern required').max(100, 'Model pattern too long'),
  inputPricePerMillion: z.number().min(0, 'Price must be positive'),
  cachedInputPricePerMillion: z.number().min(0, 'Price must be positive').optional().default(0),
  outputPricePerMillion: z.number().min(0, 'Price must be positive'),
})

export const updatePricingSchema = createPricingSchema.partial()

// Common ID parameter schema
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

// History update schema
export const updateHistorySchema = z.object({
  input: generateInputSchema.optional(),
  output: z.object({
    content: z.string(),
    metrics: z.object({
      readabilityScore: z.number(),
      gradeLevel: z.number(),
      wordCount: z.number(),
      sentenceCount: z.number(),
      avgSentenceLength: z.number(),
      readTimeMinutes: z.number(),
    }),
    tips: z.array(z.object({
      title: z.string(),
      description: z.string(),
      example: z.string().optional(),
    })),
    generatedAt: z.string(),
  }).optional(),
})
