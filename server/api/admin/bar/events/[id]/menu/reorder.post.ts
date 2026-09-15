import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin } from '../../../../../../utils/bar'

/** The order the waiters see the menu in — and, since an item dragged into
    another group joins it, which group each item sits in. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<{ items?: Array<{ id: number; category?: string }> }>(event)
  const db = await useDb()
  const mine = new Set((await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, id))).map(m => m.id))
  let sort = 0
  for (const it of b?.items || []) {
    const mid = Number(it.id)
    if (!mine.has(mid)) continue
    const set: any = { sort: ++sort }
    if (it.category !== undefined) set.category = String(it.category).trim()
    await db.update(s.barMenuItems).set(set).where(eq(s.barMenuItems.id, mid))
  }
  return { ok: true }
})
