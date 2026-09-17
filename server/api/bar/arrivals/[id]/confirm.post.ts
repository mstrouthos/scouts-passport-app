import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireBarStaff, acceptsOf } from '../../../../utils/bar'
import { now } from '../../../../utils/passcode'

/** The card cashier confirms a door card someone else wrote down, naming
    the account it went to. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['cashier'])
  if (!acceptsOf(me).includes('card')) throw createError({ statusCode: 403, message: 'Card cashier only' })
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<{ accountId?: number }>(event)
  const db = await useDb()
  const row = (await db.select().from(s.barArrivals).where(eq(s.barArrivals.id, id)))[0]
  if (!row || row.eventId !== me.eventId) throw createError({ statusCode: 404, message: 'Not found' })
  if (row.method !== 'card') throw createError({ statusCode: 409, message: 'Not a card payment' })
  const aid = Number(b?.accountId)
  const acc = Number.isInteger(aid) ? (await db.select().from(s.barAccounts).where(eq(s.barAccounts.id, aid)))[0] : null
  if (!acc || acc.eventId !== me.eventId || !acc.isActive) throw createError({ statusCode: 400, message: 'Σε ποιον λογαριασμό πήγε;' })
  await db.update(s.barArrivals).set({ accountId: acc.id, confirmedAt: now(), confirmedBy: me.id }).where(eq(s.barArrivals.id, id))
  return { ok: true }
})
