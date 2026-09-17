import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { requireBarAdmin } from '../../../../../utils/bar'

/** Wipe a night's orders — every line, every payment — leaving the menu,
    crew, accounts and floor plan for the next one. Irreversible, so it
    asks for the word. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<{ confirm?: string }>(event)
  if (String(b?.confirm || '').trim().toUpperCase() !== 'ΚΑΘΑΡΙΣΜΟΣ')
    throw createError({ statusCode: 400, message: 'Γράψε ΚΑΘΑΡΙΣΜΟΣ για επιβεβαίωση' })
  const db = await useDb()
  const orderIds = (await db.select({ id: s.barOrders.id }).from(s.barOrders).where(eq(s.barOrders.eventId, id))).map(x => x.id)
  if (orderIds.length) await db.delete(s.barOrderItems).where(inArray(s.barOrderItems.orderId, orderIds))
  await db.delete(s.barOrders).where(eq(s.barOrders.eventId, id))
  await db.delete(s.barArrivals).where(eq(s.barArrivals.eventId, id))
  return { cleared: orderIds.length }
})
