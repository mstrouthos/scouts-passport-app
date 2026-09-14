import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireBarReader, canReadBar } from '../../../../utils/bar'

/** One night in full: settings, menu, crew (with their codes, for handing
    out) and the figures. Read-only unless you are the Αρχηγός Συστήματος. */
export default defineEventHandler(async (event) => {
  const me = await requireBarReader(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, id)).limit(1))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Not found' })
  const menu = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, id))).sort((a, b) => a.sort - b.sort || a.id - b.id)
  const staff = (await db.select().from(s.barStaff).where(eq(s.barStaff.eventId, id))).sort((a, b) => a.id - b.id)
  return { ...ev, canEdit: me.role === 'troop_leader', menu, staff }
})
