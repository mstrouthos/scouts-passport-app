import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'

/** Events for this parent's sections, plus troop-wide ones — past ones included. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = (await useDb())
  return (await db.select().from(s.events))
    .filter(e => e.scope !== 'leaders')
    .filter(e => e.scope === 'troop' || (e.scope === 'section' && e.sectionId != null && p.sectionIds.includes(e.sectionId)))
    // past events come too — the page keeps them in an archive
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(e => ({
      id: e.id, scope: e.scope, sectionId: e.sectionId, titleEl: e.titleEl, titleEn: e.titleEn,
      location: e.location, descriptionEl: e.descriptionEl, themeEl: e.themeEl,
      startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay
    }))
})
