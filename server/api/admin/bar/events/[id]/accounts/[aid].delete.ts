import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin } from '../../../../../../utils/bar'

/** An account money already went to stays on the books, just retired. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const aid = Number(getRouterParam(event, 'aid'))
  const db = await useDb()
  const used = (await db.select().from(s.barOrders).where(eq(s.barOrders.accountId, aid))).length > 0
  if (used) await db.update(s.barAccounts).set({ isActive: false }).where(eq(s.barAccounts.id, aid))
  else await db.delete(s.barAccounts).where(eq(s.barAccounts.id, aid))
  return { ok: true }
})
