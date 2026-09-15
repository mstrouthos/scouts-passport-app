import { eq } from 'drizzle-orm'
import { schema as s } from '../../db'
import { requireBarStaff, ordersWithItems } from '../../utils/bar'

/** The whole night's orders, for every crew role — a waiter's screen shows
    their own, a bartender's their waiters', but everyone needs every table's
    total to settle a bill. Polled every few seconds. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  return ordersWithItems(eq(s.barOrders.eventId, me.eventId))
})
