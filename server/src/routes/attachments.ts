import { Router, type Response } from 'express'
import crypto from 'crypto'
import multer from 'multer'
import { query, queryOne, execute } from '../database/connection.js'
import { authenticate } from '../middleware/auth.js'
import { isR2Configured, uploadToR2, downloadFromR2, deleteFromR2 } from '../services/r2.js'
import type { AuthenticatedRequest, ChatAttachmentRow } from '../types.js'

const router = Router()

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  // Text
  'text/plain', 'text/markdown', 'text/csv',
])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILES = 10

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported. Supported: images, PDFs, docs, text files.`))
    }
  },
})

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
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

  return ''
}

function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  // Quick PNG dimension check (bytes 16-23)
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    if (width > 0 && height > 0) return { width, height }
  }
  // Quick JPEG dimension check
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break
      const marker = buffer[offset + 1]
      const segLen = buffer.readUInt16BE(offset + 2)
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        const height = buffer.readUInt16BE(offset + 5)
        const width = buffer.readUInt16BE(offset + 7)
        if (width > 0 && height > 0) return { width, height }
      }
      offset += 2 + segLen
    }
  }
  return null
}

function formatAttachment(row: ChatAttachmentRow) {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    size: row.size,
    url: row.data_url || `/api/attachments/${row.id}/file`,
    extractedText: row.extracted_text || undefined,
    width: row.width || undefined,
    height: row.height || undefined,
  }
}

// ---------------------------------------------------------------------------
// POST /api/attachments/upload — Upload files
// ---------------------------------------------------------------------------
router.post('/upload', authenticate, upload.array('files', MAX_FILES), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' })
      return
    }

    const userId = req.user!.userId
    const results = []

    for (const file of files) {
      const fileId = crypto.randomUUID()
      const r2Key = `attachments/${userId}/${fileId}-${file.originalname}`
      const now = new Date().toISOString()
      const isImage = isImageMime(file.mimetype)

      // Extract text for documents
      let extractedText: string | null = null
      if (!isImage) {
        try {
          extractedText = await extractText(file.buffer, file.originalname)
        } catch {
          // Non-fatal: we'll still store the file
        }
      }

      // Get image dimensions
      let width: number | null = null
      let height: number | null = null
      if (isImage) {
        const dims = getImageDimensions(file.buffer)
        if (dims) {
          width = dims.width
          height = dims.height
        }
      }

      // Store file: R2 if configured, else base64 data URL
      let r2KeyStored: string | null = null
      let dataUrl: string | null = null

      if (isR2Configured()) {
        await uploadToR2(r2Key, file.buffer, file.mimetype)
        r2KeyStored = r2Key
      } else {
        const b64 = file.buffer.toString('base64')
        dataUrl = `data:${file.mimetype};base64,${b64}`
      }

      await execute(
        `INSERT INTO chat_attachments (id, user_id, filename, mime_type, size, r2_key, data_url, extracted_text, width, height, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [fileId, userId, file.originalname, file.mimetype, file.size, r2KeyStored, dataUrl, extractedText, width, height, now]
      )

      const row = (await queryOne<ChatAttachmentRow>('SELECT * FROM chat_attachments WHERE id = $1', [fileId]))!
      results.push(formatAttachment(row))
    }

    res.status(201).json(results)
  } catch (err) {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message })
      return
    }
    console.error('Attachment upload error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to upload files' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/attachments/:id/file — Serve attachment file
// ---------------------------------------------------------------------------
router.get('/:id/file', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const row = await queryOne<ChatAttachmentRow>(
    'SELECT * FROM chat_attachments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.userId]
  )

  if (!row) {
    res.status(404).json({ error: 'Attachment not found' })
    return
  }

  if (row.data_url) {
    // Redirect to data URL (for inline display)
    res.redirect(row.data_url)
    return
  }

  if (row.r2_key) {
    try {
      const { body, contentType } = await downloadFromR2(row.r2_key)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `inline; filename="${row.filename}"`)
      res.send(body)
    } catch {
      res.status(500).json({ error: 'Failed to retrieve file' })
    }
    return
  }

  res.status(404).json({ error: 'File data not available' })
})

// ---------------------------------------------------------------------------
// DELETE /api/attachments/:id — Delete attachment
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const row = await queryOne<ChatAttachmentRow>(
    'SELECT * FROM chat_attachments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.userId]
  )

  if (!row) {
    res.status(404).json({ error: 'Attachment not found' })
    return
  }

  if (isR2Configured() && row.r2_key) {
    try {
      await deleteFromR2(row.r2_key)
    } catch {
      console.warn('Failed to delete attachment from R2:', row.r2_key)
    }
  }

  await execute('DELETE FROM chat_attachments WHERE id = $1', [row.id])
  res.json({ success: true })
})

export default router
