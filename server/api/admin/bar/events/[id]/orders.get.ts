import { eq } from 'drizzle-orm'
import { schema as s } from '../../../../../db'
import { requireBarReader, ordersWithItems } from '../../../../../utils/bar'

/** Every order of the night, for the people who read the books. */
export default defineEventHandler(async (event) => {
  await requireBarReader(event)
  const id = Number(getRouterParam(event, 'id'))
  return ordersWithItems(eq(s.barOrders.eventId, id))
})
