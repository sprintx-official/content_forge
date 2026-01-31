import type { Attachment } from '@/types'

export async function uploadAttachments(files: File[]): Promise<Attachment[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const TOKEN_KEY = 'cf_jwt'
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('/api/attachments/upload', {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(data.error || `Upload failed with status ${res.status}`)
  }

  return res.json()
}

export function getAttachmentUrl(id: string): string {
  return `/api/attachments/${id}/file`
}
