import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomBytes } from 'node:crypto'

/** Where attachments live.

    With NUXT_S3_BUCKET set (plus region and keys; NUXT_S3_ENDPOINT for R2 or
    MinIO) a file goes to the bucket and the row keeps only its key, as
    "s3:<key>". Without it the base64 stays in the row, as it always did — so
    nothing breaks on a machine with no bucket, and files stored before the
    bucket existed keep serving. */
function client(): { s3: S3Client, bucket: string } | null {
  const c = useRuntimeConfig()
  if (!c.s3Bucket || !c.s3AccessKeyId || !c.s3SecretAccessKey) return null
  return {
    bucket: c.s3Bucket,
    s3: new S3Client({
      region: c.s3Region || 'auto',
      endpoint: c.s3Endpoint || undefined,
      forcePathStyle: !!c.s3Endpoint,
      credentials: { accessKeyId: c.s3AccessKeyId, secretAccessKey: c.s3SecretAccessKey }
    })
  }
}

export const isS3Ref = (data: string) => data.startsWith('s3:')

/** Store bytes; returns what to keep in files.data. */
export async function storeFile(buf: Buffer, mime: string, name: string): Promise<string> {
  const c = client()
  if (!c) return buf.toString('base64')
  const safe = name.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const key = `attachments/${new Date().toISOString().slice(0, 10)}/${randomBytes(8).toString('hex')}-${safe}`
  await c.s3.send(new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: buf, ContentType: mime }))
  return `s3:${key}`
}

/** A short-lived URL to read a stored object — the app checks who is asking
    first, then hands them this. */
export async function signedReadUrl(data: string, name: string, download: boolean): Promise<string> {
  const c = client()
  if (!c) throw createError({ statusCode: 500, message: 'Bucket not configured' })
  const disposition = `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`
  return getSignedUrl(c.s3, new GetObjectCommand({
    Bucket: c.bucket, Key: data.slice(3), ResponseContentDisposition: disposition
  }), { expiresIn: 300 })
}

export async function deleteStored(data: string): Promise<void> {
  const c = client()
  if (!c || !isS3Ref(data)) return
  try { await c.s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: data.slice(3) })) }
  catch (err) { console.warn('[storage] delete failed', err) }
}
