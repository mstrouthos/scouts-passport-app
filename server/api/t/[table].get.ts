import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { tableOrThrow } from '../../utils/guestTable'

/** What a guest sees after scanning the table's code: the menu, and whether
    their waiter has already been called. */
export default defineEventHandler(async (event) => {
  const { ev, tableNo } = await tableOrThrow(getRouterParam(event, 'table'))
  const db = await useDb()
  const menu = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, ev.id)))
    .filter(m => m.isActive).sort((a, b) => a.sort - b.sort || a.id - b.id)
    .map(m => ({ id: m.id, category: m.category, name: m.name, priceCents: m.priceCents, couponOk: m.couponOk, couponCost: m.couponCost }))
  const open = (await db.select().from(s.barCalls).where(eq(s.barCalls.eventId, ev.id)))
    .find(c => c.tableNo === tableNo && !c.handledAt)
  return { event: { name: ev.name, couponsPerAdult: ev.couponsPerAdult }, tableNo, menu, calledAt: open?.createdAt ?? null }
})
