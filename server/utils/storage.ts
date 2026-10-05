import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomBytes } from 'node:crypto'
import { reportError } from './errorReport'

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

/** Store bytes; returns what to keep in files.data. `folder` groups them in
    the bucket — attachments, form uploads, exports. */
export async function storeFile(buf: Buffer, mime: string, name: string, folder = 'attachments'): Promise<string> {
  const c = client()
  if (!c) return buf.toString('base64')
  const safe = name.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomBytes(8).toString('hex')}-${safe}`
  try {
    await c.s3.send(new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: buf, ContentType: mime }))
  } catch (err) { throw await storageFailed('ανέβασμα', err, { folder, size: buf.length, mime }) }
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

/** The bytes back, from the bucket or the row — for files the app itself
    must open (an encrypted upload, to decrypt and hand over). */
export async function readStored(data: string): Promise<Buffer> {
  if (!isS3Ref(data)) return Buffer.from(data, 'base64')
  const c = client()
  if (!c) throw createError({ statusCode: 500, message: 'Bucket not configured' })
  let r
  try { r = await c.s3.send(new GetObjectCommand({ Bucket: c.bucket, Key: data.slice(3) })) }
  catch (err) { throw await storageFailed('ανάγνωση', err, { key: data.slice(3, 60) }) }
  return Buffer.from(await r.Body!.transformToByteArray())
}

export const bucketConfigured = () => client() !== null

export async function deleteStored(data: string): Promise<void> {
  const c = client()
  if (!c || !isS3Ref(data)) return
  try { await c.s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: data.slice(3) })) }
  catch (err) { await reportError('Αποθήκευση αρχείων (S3) — διαγραφή', err, { key: data.slice(3, 60), ...where() }) }
}

/* where the bucket is, for the report — never its keys */
function where() {
  const c = useRuntimeConfig()
  let endpoint = c.s3Endpoint || '(AWS)'
  try { if (c.s3Endpoint) endpoint = new URL(c.s3Endpoint).host } catch {}
  return { bucket: c.s3Bucket, region: c.s3Region || '(auto)', endpoint }
}
/** A bucket that would not take or give a file: reported with its settings
    and the provider's own error code, and turned into a message a person can
    read instead of "Server Error". */
async function storageFailed(what: string, err: unknown, ctx: Record<string, unknown>) {
  await reportError(`Αποθήκευση αρχείων (S3) — ${what}`, err, { ...ctx, ...where() })
  const e: any = createError({ statusCode: 502, message: 'Η αποθήκευση του αρχείου απέτυχε — δοκιμάστε ξανά σε λίγο.' })
  e.reported = true
  return e
}
