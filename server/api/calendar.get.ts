import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = useDb()
  const patrol = me.patrolId ? db.select().from(s.patrols).where(eq(s.patrols.id, me.patrolId)).get() : null
  const rows = db.select().from(s.events).all()
    .filter(e => e.scope === 'troop'
      || (e.scope === 'section' && patrol && e.sectionId === patrol.sectionId)
      || (e.scope === 'patrol' && e.patrolId === me.patrolId))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return rows.map(e => ({
    id: e.id, scope: e.scope, titleEl: e.titleEl, titleEn: e.titleEn,
    location: e.location, startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay
  }))
})
