import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireBarStaff, couponBalances } from '../../../utils/bar'

/** Undo an entry — only by the cashier who made it. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['cashier'])
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const row = (await db.select().from(s.barArrivals).where(eq(s.barArrivals.id, id)))[0]
  if (!row || row.eventId !== me.eventId) throw createError({ statusCode: 404, message: 'Not found' })
  if (row.cashierId !== me.id) throw createError({ statusCode: 403, message: 'Not yours to undo' })
  if (row.confirmedAt && row.confirmedBy !== me.id) throw createError({ statusCode: 409, message: 'Επιβεβαιώθηκε ήδη από το ταμείο καρτών' })
  // their coupons may already be spent at the bar
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, me.eventId)))[0]
  const bal = (await couponBalances(me.eventId))[row.tableNo]
  if (bal && bal.left - row.count * (ev?.couponsPerAdult ?? 1) < 0)
    throw createError({ statusCode: 409, message: 'Τα κουπόνια αυτών των ατόμων έχουν ήδη χρησιμοποιηθεί στο μπαρ' })
  await db.delete(s.barArrivals).where(eq(s.barArrivals.id, id))
  return { ok: true }
})
