import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { requireBarAdmin } from '../../../../../utils/bar'

/** Add one item, or a whole list at once (the printed menu, typed in). */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<any>(event)
  const db = await useDb()
  const existing = await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, id))
  let sort = existing.reduce((m, x) => Math.max(m, x.sort), 0)
  const rows = (Array.isArray(b?.items) ? b.items : [b]).map((x: any) => ({
    eventId: id, category: String(x?.category || '').trim(), name: String(x?.name || '').trim(),
    priceCents: Math.max(0, Math.round(Number(x?.price) * 100) || 0), couponOk: !!x?.couponOk, couponCost: Math.max(1, Math.floor(Number(x?.couponCost)) || 1), sort: ++sort, isActive: true
  })).filter((x: any) => x.name)
  if (!rows.length) throw createError({ statusCode: 400, message: 'Name required' })
  await db.insert(s.barMenuItems).values(rows)
  return { added: rows.length }
})
