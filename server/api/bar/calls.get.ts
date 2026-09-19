import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff, parseLayout } from '../../utils/bar'

/** Open calls: a waiter's own tables (and the unassigned ones); everything
    for anyone else. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, me.eventId)))[0]
  const waiters = parseLayout(ev?.layout ?? null)?.waiters || {}
  const calls = (await db.select().from(s.barCalls).where(eq(s.barCalls.eventId, me.eventId))).filter(c => !c.handledAt).sort((a, b) => a.id - b.id)
  if (me.role !== 'waiter') return calls
  return calls.filter(c => { const w = waiters[String(c.tableNo)]; return !w || w === me.id })
})
