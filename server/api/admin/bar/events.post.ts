import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireBarAdmin } from '../../../utils/bar'
import { now } from '../../../utils/passcode'

/** A new night. Its menu can start as a copy of an earlier one's. */
export default defineEventHandler(async (event) => {
  const me = await requireBarAdmin(event)
  const b = await readBody<{ name?: string; eventDate?: string; tableCount?: number; copyMenuFrom?: number; templateId?: number }>(event)
  const name = String(b?.name || '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name required' })
  const db = await useDb()
  const [row] = await db.insert(s.barEvents).values({
    name, eventDate: b?.eventDate || null,
    tableCount: Math.min(200, Math.max(1, Math.floor(Number(b?.tableCount) || 10))),
    status: 'open', createdBy: me.id, createdAt: now()
  }).returning()
  if (b?.templateId) {
    const src = (await db.select().from(s.barMenuTemplateItems).where(eq(s.barMenuTemplateItems.templateId, Number(b.templateId))))
    if (src.length) await db.insert(s.barMenuItems).values(src.map(m => ({
      eventId: row.id, category: m.category, name: m.name, priceCents: m.priceCents, couponOk: m.couponOk, couponCost: m.couponCost, sort: m.sort, isActive: true
    })))
  } else if (b?.copyMenuFrom) {
    const src = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, Number(b.copyMenuFrom)))).filter(m => m.isActive)
    if (src.length) await db.insert(s.barMenuItems).values(src.map(m => ({
      eventId: row.id, category: m.category, name: m.name, priceCents: m.priceCents, couponOk: m.couponOk, couponCost: m.couponCost, sort: m.sort, isActive: true
    })))
  }
  return { id: row.id }
})
