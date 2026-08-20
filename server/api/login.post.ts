import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { hmacPasscode } from '../utils/passcode'

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

  const db = useDb()
  const row = db.select().from(s.scouts).where(eq(s.scouts.passcodeHmac, hmacPasscode(digits))).get()
  if (!row || !row.isActive) {
    tries.set(ip, { n: (rec && nowT - rec.t < 600_000 ? rec.n : 0) + 1, t: rec && nowT - rec.t < 600_000 ? rec.t : nowT })
    globalFails.n++
    throw createError({ statusCode: 401, message: 'Unknown passcode' })
  }
  tries.delete(ip)
  await setUserSession(event, { user: { id: row.id, role: row.role } })
  return { ok: true, role: row.role, locale: row.locale }
})
