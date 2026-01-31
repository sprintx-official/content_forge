import { z } from 'zod'

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(20000, 'Message too long'),
  context: z.string().max(50000, 'Context too long').optional(),
  modelId: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
})

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})
