import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/* Form responses are kept encrypted (AES-256-GCM), so a copy of the database
   or a backup on its own gives away nothing about the children in them. The
   key lives only in the environment, NUXT_FORMS_KEY; without one it is derived
   from the passcode pepper, which is also kept only there.

   Changing or losing the key makes every response stored before unreadable —
   it must be set once and kept. */
let key: Buffer | null = null
function theKey(): Buffer {
  if (key) return key
  const cfg = useRuntimeConfig() as any
  const secret = cfg.formsKey || process.env.NUXT_FORMS_KEY
  if (!secret) console.warn('[forms] NUXT_FORMS_KEY is not set — the key is derived from the passcode pepper')
  key = createHash('sha256').update(secret ? `forms:${secret}` : `forms-pepper:${cfg.passcodePepper}`).digest()
  return key
}

export function seal(data: unknown): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', theKey(), iv)
  const body = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final()])
  return 'v1:' + Buffer.concat([iv, c.getAuthTag(), body]).toString('base64')
}

export function unseal<T = any>(sealed: string): T {
  if (!sealed.startsWith('v1:')) throw new Error('Unknown sealed format')
  const raw = Buffer.from(sealed.slice(3), 'base64')
  const d = createDecipheriv('aes-256-gcm', theKey(), raw.subarray(0, 12))
  d.setAuthTag(raw.subarray(12, 28))
  return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8'))
}

/** A one-way fingerprint of the sender's address, for the rate limit only. */
export function ipHash(ip: string): string {
  return createHash('sha256').update(`ip:${ip}:${(useRuntimeConfig() as any).passcodePepper}`).digest('hex').slice(0, 32)
}
