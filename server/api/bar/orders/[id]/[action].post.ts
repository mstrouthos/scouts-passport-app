import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireBarStaff } from '../../../../utils/bar'
import { now } from '../../../../utils/passcode'
import { sendPushToBarStaff } from '../../../../utils/push'

/** One order, one step: the bartender readies it and, when the waiter
    brings the money to the bar, marks it paid; the waiter delivers or
    cancels; the cashier confirms a card. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  const id = Number(getRouterParam(event, 'id'))
  const action = String(getRouterParam(event, 'action'))
  const db = await useDb()
  const o = (await db.select().from(s.barOrders).where(eq(s.barOrders.id, id)).limit(1))[0]
  if (!o || o.eventId !== me.eventId) throw createError({ statusCode: 404, message: 'Not found' })
  const mine = o.waiterId === me.id
  const set: Partial<typeof o> = {}
  const t = now()

  if (action === 'ready') {
    if (me.role !== 'bartender' || o.bartenderId !== me.id) throw createError({ statusCode: 403, message: 'Not your order' })
    if (o.status !== 'new') throw createError({ statusCode: 409, message: 'Already handled' })
    set.status = 'ready'; set.readyAt = t
  } else if (action === 'delivered') {
    if (me.role !== 'waiter' || !mine) throw createError({ statusCode: 403, message: 'Not your order' })
    if (o.status !== 'ready') throw createError({ statusCode: 409, message: 'Not ready yet' })
    set.status = 'delivered'; set.deliveredAt = t
  } else if (action === 'cancel') {
    if (me.role !== 'waiter' || !mine) throw createError({ statusCode: 403, message: 'Not your order' })
    // once the bar has made it, it is made
    if (o.status !== 'new') throw createError({ statusCode: 409, message: 'Ετοιμάστηκε ήδη — δεν ακυρώνεται' })
    set.status = 'cancelled'; set.cancelledAt = t
  } else if (action === 'pay') {
    // the money changes hands at the bar, so the bar writes it down
    if (me.role !== 'bartender' || o.bartenderId !== me.id) throw createError({ statusCode: 403, message: 'Not your order' })
    if (o.status === 'cancelled') throw createError({ statusCode: 409, message: 'Cancelled' })
    const b = await readBody<{ method?: string }>(event)
    const method = b?.method === 'card' ? 'card' : b?.method === 'cash' ? 'cash' : null
    if (!method) throw createError({ statusCode: 400, message: 'Μετρητά ή κάρτα;' })
    set.paidMethod = method; set.paidAt = t; set.paidBy = me.id
    // a card is money only once the cardholder says so
    set.cardConfirmedAt = null; set.cardConfirmedBy = null
  } else if (action === 'unpay') {
    if (me.role !== 'bartender' || o.bartenderId !== me.id) throw createError({ statusCode: 403, message: 'Not your order' })
    if (o.cardConfirmedAt) throw createError({ statusCode: 409, message: 'Η κάρτα επιβεβαιώθηκε ήδη' })
    set.paidMethod = null; set.paidAt = null; set.paidBy = null
  } else if (action === 'confirm-card') {
    if (me.role !== 'cashier') throw createError({ statusCode: 403, message: 'Cashier only' })
    if (o.paidMethod !== 'card' || !o.paidAt) throw createError({ statusCode: 409, message: 'Not a card payment' })
    set.cardConfirmedAt = t; set.cardConfirmedBy = me.id
  } else throw createError({ statusCode: 404, message: 'Unknown action' })

  await db.update(s.barOrders).set(set).where(eq(s.barOrders.id, id))
  // the waiter's phone buzzes: it is on the counter, come and get it
  if (action === 'ready') {
    const items = await db.select().from(s.barOrderItems).where(eq(s.barOrderItems.orderId, id))
    sendPushToBarStaff([o.waiterId], {
      title: `✅ Έτοιμη #${o.number} · Τραπέζι ${o.tableNo}`,
      body: `${items.map(i => `${i.qty}× ${i.name}`).join(', ')} — πάρ' την από τον ${me.name}`
    }).catch(err => console.error('[bar] push failed', err))
  }
  return { ok: true }
})
