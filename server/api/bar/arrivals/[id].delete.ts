import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireBarStaff } from '../../../utils/bar'

/** Undo an entry — only by the cashier who made it. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['cashier'])
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const row = (await db.select().from(s.barArrivals).where(eq(s.barArrivals.id, id)))[0]
  if (!row || row.eventId !== me.eventId) throw createError({ statusCode: 404, message: 'Not found' })
  if (row.cashierId !== me.id) throw createError({ statusCode: 403, message: 'Not yours to undo' })
  await db.delete(s.barArrivals).where(eq(s.barArrivals.id, id))
  return { ok: true }
})
