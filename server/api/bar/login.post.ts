import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'

const tries = new Map<string, { n: number, t: number }>()

/** The crew signs in with a six-digit code handed out for the night. */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const nowT = Date.now()
  const rec = tries.get(ip)
  if (rec && nowT - rec.t < 600_000 && rec.n >= 10)
    throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })
  const body = await readBody<{ code?: string }>(event)
  const code = String(body?.code || '').replace(/\D/g, '')
  if (code.length !== 6) throw createError({ statusCode: 400, message: 'Bad code' })
  const db = await useDb()
  const row = (await db.select().from(s.barStaff).where(eq(s.barStaff.code, code)).limit(1))[0]
  const ev = row ? (await db.select().from(s.barEvents).where(eq(s.barEvents.id, row.eventId)).limit(1))[0] : null
  if (!row || !row.isActive || !ev || ev.status !== 'open') {
    tries.set(ip, { n: (rec && nowT - rec.t < 600_000 ? rec.n : 0) + 1, t: rec && nowT - rec.t < 600_000 ? rec.t : nowT })
    throw createError({ statusCode: 401, message: 'Άγνωστος κωδικός' })
  }
  tries.delete(ip)
  await setUserSession(event, { bar: { staffId: row.id } })
  return { ok: true, role: row.role, name: row.name }
})
