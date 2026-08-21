import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'

/** Upcoming events for this parent's section, plus troop-wide ones. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = (await useDb())
  return (await db.select().from(s.events))
    .filter(e => e.scope === 'troop' || (e.scope === 'section' && e.sectionId === p.sectionId))
    .filter(e => new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(e => ({
      id: e.id, scope: e.scope, titleEl: e.titleEl, titleEn: e.titleEn,
      location: e.location, startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay
    }))
})
