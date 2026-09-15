import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireBarAdmin } from '../../../utils/bar'
import { now } from '../../../utils/passcode'

/** Keep an event's menu (its visible items) under a name, for next time. */
export default defineEventHandler(async (event) => {
  const me = await requireBarAdmin(event)
  const b = await readBody<{ name?: string; fromEventId?: number }>(event)
  const name = String(b?.name || '').trim()
  if (!name || !b?.fromEventId) throw createError({ statusCode: 400, message: 'Name and event required' })
  const db = await useDb()
  const src = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, Number(b.fromEventId)))).filter(m => m.isActive)
  if (!src.length) throw createError({ statusCode: 400, message: 'Το μενού είναι άδειο' })
  const [t] = await db.insert(s.barMenuTemplates).values({ name, createdBy: me.id, createdAt: now() }).returning()
  await db.insert(s.barMenuTemplateItems).values(src.map(m => ({
    templateId: t.id, category: m.category, name: m.name, priceCents: m.priceCents, couponOk: m.couponOk, sort: m.sort
  })))
  return { id: t.id, items: src.length }
})
