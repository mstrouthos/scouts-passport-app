import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const b = await readBody<any>(event)
  const endpoint = String(b?.endpoint || '')
  const p256dh = String(b?.keys?.p256dh || '')
  const auth = String(b?.keys?.auth || '')
  if (!endpoint || !p256dh || !auth) throw createError({ statusCode: 400, message: 'Bad subscription' })
  const db = useDb()
  db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, endpoint)).run()
  db.insert(s.pushSubscriptions).values({
    scoutId: me.id, endpoint, p256dh, auth,
    userAgent: getHeader(event, 'user-agent') || null, createdAt: now()
  }).run()
  return { ok: true }
})
