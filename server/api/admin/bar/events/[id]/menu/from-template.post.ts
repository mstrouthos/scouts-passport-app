import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin } from '../../../../../../utils/bar'

/** Fill this event's menu from a saved one, after whatever is already there. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<{ templateId?: number }>(event)
  const db = await useDb()
  const src = await db.select().from(s.barMenuTemplateItems).where(eq(s.barMenuTemplateItems.templateId, Number(b?.templateId)))
  if (!src.length) throw createError({ statusCode: 400, message: 'Empty template' })
  let sort = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, id))).reduce((m, x) => Math.max(m, x.sort), 0)
  await db.insert(s.barMenuItems).values(src.map(m => ({
    eventId: id, category: m.category, name: m.name, priceCents: m.priceCents, couponOk: m.couponOk, sort: ++sort, isActive: true
  })))
  return { added: src.length }
})
