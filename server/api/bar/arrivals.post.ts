import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff, acceptsOf } from '../../utils/bar'
import { now } from '../../utils/passcode'

/** A cashier lets a party in: how many, which table, how they paid the
    door. Cash needs a cashier who takes cash. A card can be written down by
    any cashier — if they hold the machine it is confirmed on the spot with
    the account named; otherwise it waits for the card cashier to confirm.
    More than the table was booked for is fine — the count says so. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['cashier'])
  const b = await readBody<{ tableNo?: number; count?: number; kids?: number; method?: string; accountId?: number }>(event)
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, me.eventId)))[0]
  const tableNo = Number(b?.tableNo)
  const count = Math.floor(Number(b?.count)) || 0
  const kids = Math.max(0, Math.min(99, Math.floor(Number(b?.kids)) || 0))
  const method = b?.method === 'card' ? 'card' : b?.method === 'cash' ? 'cash' : null
  if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > ev.tableCount) throw createError({ statusCode: 400, message: 'Διάλεξε τραπέζι' })
  if (count < 0 || count > 99 || (count === 0 && kids === 0)) throw createError({ statusCode: 400, message: 'Πόσα άτομα;' })
  // children alone owe nothing, so nothing to take
  if (count === 0) { const [row] = await db.insert(s.barArrivals).values({ eventId: me.eventId, tableNo, count: 0, kids, method: 'cash', accountId: null, cashierId: me.id, confirmedAt: now(), confirmedBy: me.id, createdAt: now() }).returning(); return { id: row.id, pending: false } }
  if (!method) throw createError({ statusCode: 400, message: 'Μετρητά ή κάρτα;' })
  const takes = acceptsOf(me)
  if (method === 'cash' && !takes.includes('cash')) throw createError({ statusCode: 403, message: 'Δεν δέχεσαι μετρητά' })
  let accountId: number | null = null, confirmedAt: string | null = null, confirmedBy: number | null = null
  if (method === 'card' && takes.includes('card')) {
    const aid = Number(b?.accountId)
    const acc = Number.isInteger(aid) ? (await db.select().from(s.barAccounts).where(eq(s.barAccounts.id, aid)))[0] : null
    if (!acc || acc.eventId !== me.eventId || !acc.isActive) throw createError({ statusCode: 400, message: 'Σε ποιον λογαριασμό πήγε;' })
    accountId = acc.id; confirmedAt = now(); confirmedBy = me.id
  }
  const [row] = await db.insert(s.barArrivals).values({ eventId: me.eventId, tableNo, count, kids, method, accountId, cashierId: me.id, confirmedAt, confirmedBy, createdAt: now() }).returning()
  return { id: row.id, pending: method === 'card' && !confirmedAt }
})
