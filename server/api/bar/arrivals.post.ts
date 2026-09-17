import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff, acceptsOf } from '../../utils/bar'
import { now } from '../../utils/passcode'

/** A cashier lets a party in: how many, which table, how they paid the
    door. Only a cashier who takes that kind of money; a card names the
    account. More than the table was booked for is fine — the count says so. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['cashier'])
  const b = await readBody<{ tableNo?: number; count?: number; method?: string; accountId?: number }>(event)
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, me.eventId)))[0]
  const tableNo = Number(b?.tableNo)
  const count = Math.floor(Number(b?.count))
  const method = b?.method === 'card' ? 'card' : b?.method === 'cash' ? 'cash' : null
  if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > ev.tableCount) throw createError({ statusCode: 400, message: 'Διάλεξε τραπέζι' })
  if (!Number.isInteger(count) || count < 1 || count > 99) throw createError({ statusCode: 400, message: 'Πόσα άτομα;' })
  if (!method || !acceptsOf(me).includes(method)) throw createError({ statusCode: 403, message: 'Δεν δέχεσαι αυτή την πληρωμή' })
  let accountId: number | null = null
  if (method === 'card') {
    const aid = Number(b?.accountId)
    const acc = Number.isInteger(aid) ? (await db.select().from(s.barAccounts).where(eq(s.barAccounts.id, aid)))[0] : null
    if (!acc || acc.eventId !== me.eventId || !acc.isActive) throw createError({ statusCode: 400, message: 'Σε ποιον λογαριασμό πήγε;' })
    accountId = acc.id
  }
  const [row] = await db.insert(s.barArrivals).values({ eventId: me.eventId, tableNo, count, method, accountId, cashierId: me.id, createdAt: now() }).returning()
  return { id: row.id }
})
