import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin } from '../../../../../../utils/bar'

/** Remove an item outright. Orders already taken keep the name and price
    they were written with, so the figures lose nothing. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const mid = Number(getRouterParam(event, 'mid'))
  const db = await useDb()
  await db.update(s.barOrderItems).set({ menuItemId: null }).where(eq(s.barOrderItems.menuItemId, mid))
  await db.delete(s.barMenuItems).where(eq(s.barMenuItems.id, mid))
  return { ok: true }
})
