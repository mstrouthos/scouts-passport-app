import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff } from '../../utils/bar'
import { now } from '../../utils/passcode'

/** A waiter sends a table's order to their bartender. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['waiter'])
  const b = await readBody<{ tableNo?: number; items?: Array<{ menuItemId: number; qty: number }>; note?: string }>(event)
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, me.eventId)).limit(1))[0]
  const tableNo = Number(b?.tableNo)
  if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > ev.tableCount)
    throw createError({ statusCode: 400, message: 'Διάλεξε τραπέζι' })
  if (!me.bartenderId) throw createError({ statusCode: 400, message: 'Δεν έχεις bartender — πες το στον υπεύθυνο' })
  const menu = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, me.eventId))).filter(m => m.isActive)
  const lines = (b?.items || []).map(l => ({ item: menu.find(m => m.id === Number(l.menuItemId)), qty: Math.min(99, Math.max(0, Math.floor(Number(l.qty)))) }))
    .filter(l => l.item && l.qty > 0) as Array<{ item: typeof menu[number]; qty: number }>
  if (!lines.length) throw createError({ statusCode: 400, message: 'Η παραγγελία είναι άδεια' })
  const total = lines.reduce((a, l) => a + l.item.priceCents * l.qty, 0)
  const number = (await db.select().from(s.barOrders).where(eq(s.barOrders.eventId, me.eventId))).reduce((m, o) => Math.max(m, o.number), 0) + 1
  const [row] = await db.insert(s.barOrders).values({
    eventId: me.eventId, number, tableNo, waiterId: me.id, bartenderId: me.bartenderId,
    status: 'new', totalCents: total, note: b?.note ? String(b.note).slice(0, 200) : null, createdAt: now()
  }).returning()
  await db.insert(s.barOrderItems).values(lines.map(l => ({
    orderId: row.id, menuItemId: l.item.id, name: l.item.name, priceCents: l.item.priceCents, qty: l.qty
  })))
  return { id: row.id, number }
})
