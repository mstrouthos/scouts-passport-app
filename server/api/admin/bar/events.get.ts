import { useDb, schema as s } from '../../../db'
import { requireBarReader } from '../../../utils/bar'

export default defineEventHandler(async (event) => {
  await requireBarReader(event)
  const db = await useDb()
  const orders = await db.select().from(s.barOrders)
  return (await db.select().from(s.barEvents)).sort((a, b) => b.id - a.id).map(e => {
    const mine = orders.filter(o => o.eventId === e.id && o.status !== 'cancelled')
    return {
      ...e, orders: mine.length,
      revenueCents: mine.filter(o => o.paidAt && (o.paidMethod !== 'card' || o.cardConfirmedAt)).reduce((a, o) => a + o.totalCents, 0)
    }
  })
})
