import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { now } from '../../utils/passcode'

/* naive public rate limit: 10 subs / 10 min / IP */
const hits = new Map<string, { n: number, t: number }>()

/** Public: a parent's browser subscribes to push for one no-app section. */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const rec = hits.get(ip); const t = Date.now()
  if (rec && t - rec.t < 600_000 && rec.n >= 10) throw createError({ statusCode: 429, message: 'Too many requests' })
  hits.set(ip, { n: (rec && t - rec.t < 600_000 ? rec.n : 0) + 1, t: rec && t - rec.t < 600_000 ? rec.t : t })

  const b = await readBody<any>(event)
  const db = (await useDb())
  const sec = (await db.select().from(s.sections)).find(x => x.slug === String(b?.section) && !x.hasApp)
  const endpoint = String(b?.endpoint || '')
  const p256dh = String(b?.keys?.p256dh || '')
  const auth = String(b?.keys?.auth || '')
  if (!sec || !endpoint || !p256dh || !auth) throw createError({ statusCode: 400, message: 'Bad subscription' })
  await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, endpoint))
  await db.insert(s.pushSubscriptions).values({
    scoutId: null, sectionId: sec.id, endpoint, p256dh, auth,
    userAgent: getHeader(event, 'user-agent') || null, createdAt: now()
  })
  return { ok: true }
})
