import { Router, type Response } from 'express'
import crypto from 'crypto'
import multer from 'multer'
import { queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { isR2Configured, uploadToR2, deleteFromR2 } from '../services/r2.js'
import type { AuthenticatedRequest, AgentFileRow } from '../types.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8')
  }

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  }

  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  return buffer.toString('utf-8')
}

// POST /api/files/upload
router.post('/upload', authenticate, requireAdmin, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = req.file
    const agentId = req.body.agentId
    if (!file || !agentId) {
      res.status(400).json({ error: 'File and agentId are required' })
      return
    }

    // Verify agent exists
    const agent = await queryOne('SELECT id FROM agents WHERE id = $1', [agentId])
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const fileId = crypto.randomUUID()
    const r2Key = `agents/${agentId}/${fileId}-${file.originalname}`
    const now = new Date().toISOString()

    // Upload to R2 if configured, otherwise store content_text only
    if (isR2Configured()) {
      await uploadToR2(r2Key, file.buffer, file.mimetype)
    }

    // Extract text content
    const contentText = await extractText(file.buffer, file.originalname)

    await execute(
      'INSERT INTO agent_files (id, agent_id, name, type, size, r2_key, content_text, uploaded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [fileId, agentId, file.originalname, file.mimetype || '', file.size, r2Key, contentText, now]
    )

    const row = (await queryOne<AgentFileRow>('SELECT * FROM agent_files WHERE id = $1', [fileId]))!

    res.status(201).json({
      id: row.id,
      name: row.name,
      type: row.type,
      size: row.size,
      r2Key: row.r2_key,
      contentText: row.content_text,
      uploadedAt: row.uploaded_at,
    })
  } catch (err) {
    console.error('File upload error:', err)
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

// DELETE /api/files/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = await queryOne<AgentFileRow>('SELECT * FROM agent_files WHERE id = $1', [req.params.id])
    if (!file) {
      res.status(404).json({ error: 'File not found' })
      return
    }

    // Delete from R2 if configured
    if (isR2Configured() && file.r2_key) {
      try {
        await deleteFromR2(file.r2_key)
      } catch {
        // Continue even if R2 delete fails
        console.warn('Failed to delete file from R2:', file.r2_key)
      }
    }

    await execute('DELETE FROM agent_files WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('File delete error:', err)
    res.status(500).json({ error: 'Failed to delete file' })
  }
})

export default router
