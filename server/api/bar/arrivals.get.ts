import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff } from '../../utils/bar'

/** Every arrival of the night, for whoever is at the door or reading it. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  const db = await useDb()
  const rows = (await db.select().from(s.barArrivals).where(eq(s.barArrivals.eventId, me.eventId))).sort((a, b) => a.id - b.id)
  const staff = await db.select().from(s.barStaff).where(eq(s.barStaff.eventId, me.eventId))
  const accounts = await db.select().from(s.barAccounts).where(eq(s.barAccounts.eventId, me.eventId))
  return rows.map(r => ({
    ...r,
    cashierName: staff.find(x => x.id === r.cashierId)?.name ?? null,
    accountName: accounts.find(a => a.id === r.accountId)?.name ?? null
  }))
})
