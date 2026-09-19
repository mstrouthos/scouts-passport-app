import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff, parseLayout } from '../../utils/bar'

/** The organiser lays the room out: where the tables stand, how many there
    are, and the landmarks a lost waiter steers by. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['organiser'])
  const b = await readBody<any>(event)
  const layout = parseLayout(JSON.stringify({ tables: b?.tables, marks: b?.marks, seats: b?.seats, kidSeats: b?.kidSeats, waiters: b?.waiters }))
  if (!layout) throw createError({ statusCode: 400, message: 'Bad layout' })
  const set: any = { layout: JSON.stringify(layout) }
  if (b?.tableCount !== undefined) set.tableCount = Math.min(200, Math.max(1, Math.floor(Number(b.tableCount) || 10)))
  const db = await useDb()
  await db.update(s.barEvents).set(set).where(eq(s.barEvents.id, me.eventId))
  return { ok: true }
})
