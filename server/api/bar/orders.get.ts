import { and, eq } from 'drizzle-orm'
import { schema as s } from '../../db'
import { requireBarStaff, ordersWithItems } from '../../utils/bar'

/** The orders that concern me: a waiter's own, a bartender's queue (their
    waiters' orders), the cashier's whole night. Polled every few seconds. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  const where = me.role === 'waiter' ? and(eq(s.barOrders.eventId, me.eventId), eq(s.barOrders.waiterId, me.id))
    : me.role === 'bartender' ? and(eq(s.barOrders.eventId, me.eventId), eq(s.barOrders.bartenderId, me.id))
    : eq(s.barOrders.eventId, me.eventId)
  return ordersWithItems(where)
})
