import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { hmacPasscode, passcodeVersion, now } from '../utils/passcode'

/* naive in-memory rate limit: 8 tries / 10 min per IP, plus a global brake */
const tries = new Map<string, { n: number, t: number }>()
let globalFails = { n: 0, t: Date.now() }

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const nowT = Date.now()
  const rec = tries.get(ip)
  if (rec && nowT - rec.t < 600_000 && rec.n >= 8)
    throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })
  if (nowT - globalFails.t > 600_000) globalFails = { n: 0, t: nowT }
  if (globalFails.n > 60)
    throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })

  const body = await readBody<{ passcode?: string }>(event)
  const digits = String(body?.passcode || '').replace(/\D/g, '')
  if (digits.length !== 8) throw createError({ statusCode: 400, message: 'Bad passcode' })

  const db = (await useDb())
  const row = (await db.select().from(s.scouts).where(eq(s.scouts.passcodeHmac, hmacPasscode(digits))).limit(1))[0]
  if (!row || !row.isActive) {
    tries.set(ip, { n: (rec && nowT - rec.t < 600_000 ? rec.n : 0) + 1, t: rec && nowT - rec.t < 600_000 ? rec.t : nowT })
    globalFails.n++
    throw createError({ statusCode: 401, message: 'Unknown passcode' })
  }
  tries.delete(ip)
  // stamp the first successful sign-in once, and the latest every time
  const t = now()
  await db.update(s.scouts)
    .set({ lastLoginAt: t, ...(row.firstLoginAt ? {} : { firstLoginAt: t }) })
    .where(eq(s.scouts.id, row.id))
  // `pv` pins the session to the passcode it was created with, so rotating a
  // passcode signs out any device still holding the old one.
  await setUserSession(event, { user: { id: row.id, role: row.role, pv: passcodeVersion(row.passcodeHmac) } })
  return { ok: true, role: row.role, locale: row.locale }
})
