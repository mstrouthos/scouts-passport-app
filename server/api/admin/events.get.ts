import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const secIds = scopedSectionIds(me)
  const reviews = db.select().from(s.eventReviews).all()
  const sections = new Map(db.select().from(s.sections).all().map(x => [x.id, x]))
  return db.select().from(s.events).all()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(e => {
      const sec = e.sectionId != null ? sections.get(e.sectionId) : null
      return {
        id: e.id, scope: e.scope, sectionId: e.sectionId, patrolId: e.patrolId,
        sectionEl: sec?.nameEl ?? null, sectionEn: sec?.nameEn ?? null,
        titleEl: e.titleEl, titleEn: e.titleEn, location: e.location,
        startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay, remindAt: e.remindAt,
        editable: secIds === null || (e.sectionId != null && secIds.includes(e.sectionId)),
        reviewed: reviews.some(r => r.eventId === e.id)
      }
    })
})
