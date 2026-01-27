import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { config } from '../config.js'

let client: S3Client | null = null

function getClient(): S3Client {
  if (client) return client

  if (!config.r2.endpoint || !config.r2.accessKeyId || !config.r2.secretAccessKey) {
    throw new Error('R2 configuration is incomplete. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.')
  }

  client = new S3Client({
    region: 'auto',
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  })

  return client
}

export function isR2Configured(): boolean {
  return !!(config.r2.endpoint && config.r2.accessKeyId && config.r2.secretAccessKey)
}

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  const s3 = getClient()
  await s3.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

export async function deleteFromR2(key: string): Promise<void> {
  const s3 = getClient()
  await s3.send(new DeleteObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
  }))
}
