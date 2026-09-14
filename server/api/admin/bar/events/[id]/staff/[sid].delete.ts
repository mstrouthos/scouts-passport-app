import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin } from '../../../../../../utils/bar'

/** Someone who took or made an order stays on the books, just signed out. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const sid = Number(getRouterParam(event, 'sid'))
  const db = await useDb()
  const orders = await db.select().from(s.barOrders).where(eq(s.barOrders.eventId, (await db.select().from(s.barStaff).where(eq(s.barStaff.id, sid)))[0]?.eventId ?? -1))
  const used = orders.some(o => o.waiterId === sid || o.bartenderId === sid || o.paidBy === sid || o.cardConfirmedBy === sid)
  if (used) await db.update(s.barStaff).set({ isActive: false }).where(eq(s.barStaff.id, sid))
  else {
    await db.update(s.barStaff).set({ bartenderId: null }).where(eq(s.barStaff.bartenderId, sid))
    await db.delete(s.barStaff).where(eq(s.barStaff.id, sid))
  }
  return { ok: true, hidden: used }
})
