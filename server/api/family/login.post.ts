import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { hmacPasscode } from '../../utils/passcode'
import { markSeenParent } from '../../utils/seen'

/* naive in-memory rate limit, same shape as the member login */
const tries = new Map<string, { n: number, t: number }>()

/** Parents sign in with their own code and only ever see their child's section. */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const nowT = Date.now()
  const rec = tries.get(ip)
  if (rec && nowT - rec.t < 600_000 && rec.n >= 8)
    throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })

  const body = await readBody<{ passcode?: string }>(event)
  const digits = String(body?.passcode || '').replace(/\D/g, '')
  if (digits.length !== 8) throw createError({ statusCode: 400, message: 'Bad passcode' })

  const db = (await useDb())
  const row = (await db.select().from(s.parents)
    .where(eq(s.parents.passcodeHmac, hmacPasscode(digits))).limit(1))[0]
  if (!row || !row.isActive) {
    tries.set(ip, { n: (rec && nowT - rec.t < 600_000 ? rec.n : 0) + 1, t: rec && nowT - rec.t < 600_000 ? rec.t : nowT })
    throw createError({ statusCode: 401, message: 'Unknown passcode' })
  }
  tries.delete(ip)
  await markSeenParent(row)
  await setUserSession(event, { parent: { id: row.id, sectionId: row.sectionId } })
  return { ok: true, name: row.name }
})
