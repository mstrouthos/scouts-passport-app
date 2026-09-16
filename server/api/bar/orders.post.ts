import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff, notifyCashiers } from '../../utils/bar'
import { now } from '../../utils/passcode'
import { sendPushToBarStaff } from '../../utils/push'

/** A waiter sends a table's order to their bartender. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['waiter'])
  const b = await readBody<{ tableNo?: number; items?: Array<{ menuItemId: number; qty: number; couponQty?: number }>; note?: string; method?: string }>(event)
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, me.eventId)).limit(1))[0]
  const tableNo = Number(b?.tableNo)
  if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > ev.tableCount)
    throw createError({ statusCode: 400, message: 'Διάλεξε τραπέζι' })
  if (!me.bartenderId) throw createError({ statusCode: 400, message: 'Δεν έχεις bartender — πες το στον υπεύθυνο' })
  const menu = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, me.eventId))).filter(m => m.isActive)
  const lines = (b?.items || []).map(l => {
    const item = menu.find(m => m.id === Number(l.menuItemId))
    const qty = Math.min(99, Math.max(0, Math.floor(Number(l.qty))))
    // a door coupon is good for one drink of the kinds the menu allows it on
    const couponQty = item?.couponOk ? Math.min(qty, Math.max(0, Math.floor(Number(l.couponQty) || 0))) : 0
    return { item, qty, couponQty }
  }).filter(l => l.item && l.qty > 0) as Array<{ item: typeof menu[number]; qty: number; couponQty: number }>
  if (!lines.length) throw createError({ statusCode: 400, message: 'Η παραγγελία είναι άδεια' })
  const total = lines.reduce((a, l) => a + l.item.priceCents * (l.qty - l.couponQty), 0)
  // how the table will pay: coupons alone if nothing is left to pay,
  // otherwise cash or card as the waiter was told
  const method = total === 0 ? 'coupon' : b?.method === 'card' ? 'card' : b?.method === 'cash' ? 'cash' : null
  if (!method) throw createError({ statusCode: 400, message: 'Μετρητά ή κάρτα;' })
  const number = (await db.select().from(s.barOrders).where(eq(s.barOrders.eventId, me.eventId))).reduce((m, o) => Math.max(m, o.number), 0) + 1
  const [row] = await db.insert(s.barOrders).values({
    eventId: me.eventId, number, tableNo, waiterId: me.id, bartenderId: me.bartenderId,
    status: 'new', totalCents: total, paidMethod: method, note: b?.note ? String(b.note).slice(0, 200) : null, createdAt: now()
  }).returning()
  await db.insert(s.barOrderItems).values(lines.map(l => ({
    orderId: row.id, menuItemId: l.item.id, name: l.item.name, priceCents: l.item.priceCents, qty: l.qty, couponQty: l.couponQty, couponCost: l.item.couponCost
  })))
  // buzz the bartender's phone — the order is on its way
  const what = lines.map(l => `${l.qty}× ${l.item.name}`).join(', ')
  sendPushToBarStaff([me.bartenderId], {
    title: `🍻 Νέα παραγγελία #${number} · Τραπέζι ${tableNo}`, body: `${what} — ${me.name}`
  }).catch(err => console.error('[bar] push failed', err))
  // and the cashier who takes that kind of money knows one is on its way
  notifyCashiers(me.eventId, row, me.name)
  return { id: row.id, number }
})
