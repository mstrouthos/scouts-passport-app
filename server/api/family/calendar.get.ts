import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { eventInSections, eventSectionIds } from '../../utils/eventScope'

/** Events for this parent's sections, plus troop-wide ones — past ones included. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = (await useDb())
  return (await db.select().from(s.events))
    .filter(e => e.scope !== 'leaders')
    .filter(e => e.scope === 'troop' || (e.scope === 'section' && eventInSections(e, p.sectionIds)))
    // past events come too — the page keeps them in an archive
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(e => ({
      id: e.id, scope: e.scope, sectionId: e.sectionId, sectionIds: eventSectionIds(e), titleEl: e.titleEl, titleEn: e.titleEn,
      location: e.location, descriptionEl: e.descriptionEl, themeEl: e.themeEl,
      startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay
    }))
})
