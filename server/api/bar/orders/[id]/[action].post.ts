import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireBarStaff, acceptsOf, notifyCashiers } from '../../../../utils/bar'
import { now } from '../../../../utils/passcode'
import { sendPushToBarStaff } from '../../../../utils/push'

/** One order, one step: the bartender readies it; the waiter delivers,
    cancels, or changes how the table will pay; a cashier who takes that kind
    of money marks it paid — naming the account, for a card. */
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
  let tellCashiers = false

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
    if (o.paidAt) throw createError({ statusCode: 409, message: 'Πληρώθηκε ήδη' })
    set.status = 'cancelled'; set.cancelledAt = t
  } else if (action === 'method') {
    // the table changed its mind: cash after all, or card
    if (me.role !== 'waiter' || !mine) throw createError({ statusCode: 403, message: 'Not your order' })
    if (o.paidAt) throw createError({ statusCode: 409, message: 'Πληρώθηκε ήδη' })
    if (o.totalCents === 0) throw createError({ statusCode: 409, message: 'Καλύπτεται με κουπόνια' })
    const b = await readBody<{ method?: string }>(event)
    const method = b?.method === 'card' ? 'card' : b?.method === 'cash' ? 'cash' : null
    if (!method) throw createError({ statusCode: 400, message: 'Μετρητά ή κάρτα;' })
    if (method === 'card') {
      const items = await db.select().from(s.barOrderItems).where(eq(s.barOrderItems.orderId, id))
      if (items.some(i => i.couponQty > 0)) throw createError({ statusCode: 409, message: 'Με κουπόνια, το υπόλοιπο μόνο μετρητά' })
    }
    set.paidMethod = method; tellCashiers = method !== o.paidMethod
  } else if (action === 'pay') {
    // only a cashier, and only one who takes this kind of money
    if (me.role !== 'cashier' || !o.paidMethod || !acceptsOf(me).includes(o.paidMethod))
      throw createError({ statusCode: 403, message: 'Δεν δέχεσαι αυτή την πληρωμή' })
    if (o.status === 'cancelled') throw createError({ statusCode: 409, message: 'Cancelled' })
    if (o.paidAt) throw createError({ statusCode: 409, message: 'Πληρώθηκε ήδη' })
    if (o.paidMethod === 'card') {
      const b = await readBody<{ accountId?: number }>(event)
      const accountId = Number(b?.accountId)
      const acc = Number.isInteger(accountId) ? (await db.select().from(s.barAccounts).where(eq(s.barAccounts.id, accountId)))[0] : null
      if (!acc || acc.eventId !== me.eventId || !acc.isActive) throw createError({ statusCode: 400, message: 'Σε ποιον λογαριασμό πήγε;' })
      set.accountId = acc.id
    }
    set.paidAt = t; set.paidBy = me.id
  } else if (action === 'unpay') {
    if (me.role !== 'cashier' || o.paidBy !== me.id) throw createError({ statusCode: 403, message: 'Not yours to undo' })
    set.paidAt = null; set.paidBy = null; set.accountId = null
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
  if (tellCashiers) notifyCashiers(me.eventId, { ...o, ...set } as any, me.name)
  return { ok: true }
})
