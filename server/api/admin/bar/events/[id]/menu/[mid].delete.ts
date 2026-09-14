import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin } from '../../../../../../utils/bar'

/** An item that was ever ordered is only hidden — the figures still name it. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const mid = Number(getRouterParam(event, 'mid'))
  const db = await useDb()
  const used = (await db.select().from(s.barOrderItems).where(eq(s.barOrderItems.menuItemId, mid))).length > 0
  if (used) await db.update(s.barMenuItems).set({ isActive: false }).where(eq(s.barMenuItems.id, mid))
  else await db.delete(s.barMenuItems).where(eq(s.barMenuItems.id, mid))
  return { ok: true, hidden: used }
})
