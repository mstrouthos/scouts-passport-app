import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { now } from '../../utils/passcode'

/** The browser's current push subscription, filed under whoever is signed
    in on this device — member, parent, bar crew, or several at once, since
    one cookie can hold a Βαθμοφόρος who is also a waiter tonight. Called on
    every launch and whenever the browser rotates the endpoint, so a
    subscription that quietly died (Android does this) is replaced before
    anyone notices. */
export default defineEventHandler(async (event) => {
  const b = await readBody<any>(event)
  const endpoint = String(b?.endpoint || '')
  const p256dh = String(b?.keys?.p256dh || '')
  const auth = String(b?.keys?.auth || '')
  if (!endpoint || !p256dh || !auth) throw createError({ statusCode: 400, message: 'Bad subscription' })
  const session: any = await getUserSession(event)
  const scoutId = session?.user?.id ?? null
  const parentId = session?.parent?.id ?? null
  const barStaffId = session?.bar?.staffId ?? null
  if (!scoutId && !parentId && !barStaffId) throw createError({ statusCode: 401, message: 'Not signed in' })
  const db = await useDb()
  const parent = parentId ? (await db.select().from(s.parents).where(eq(s.parents.id, parentId)))[0] : null
  // one device, one row: the session says who it belongs to right now
  const who = { scoutId, parentId: parent ? parentId : null, barStaffId, sectionId: parent?.sectionId ?? null }
  const existing = (await db.select().from(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, endpoint)))[0]
  if (existing) await db.update(s.pushSubscriptions).set({ ...who, p256dh, auth }).where(eq(s.pushSubscriptions.id, existing.id))
  else await db.insert(s.pushSubscriptions).values({ ...who, endpoint, p256dh, auth, userAgent: getHeader(event, 'user-agent') || null, createdAt: now() })
  return { ok: true }
})
