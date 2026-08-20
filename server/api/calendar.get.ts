import { useDb, schema as s } from '../db'
import { requireScout, sectionOf } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const mySection = await sectionOf(me)
  const rows = (await db.select().from(s.events))
    .filter(e => e.scope === 'troop'
      || (e.scope === 'section' && e.sectionId === mySection)
      || (e.scope === 'patrol' && e.patrolId === me.patrolId))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return rows.map(e => ({
    id: e.id, scope: e.scope, titleEl: e.titleEl, titleEn: e.titleEn,
    location: e.location, startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay
  }))
})
