import { useDb, schema as s } from '../../db'
import { requireLeader, scopedPatrolIds } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const pids = scopedPatrolIds(me)
  const reviews = db.select().from(s.eventReviews).all()
  return db.select().from(s.events).all()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(e => ({
      id: e.id, scope: e.scope, patrolId: e.patrolId,
      titleEl: e.titleEl, titleEn: e.titleEn, location: e.location,
      startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay, remindAt: e.remindAt,
      editable: pids === null || (e.scope === 'patrol' && e.patrolId != null && pids.includes(e.patrolId)),
      reviewed: reviews.some(r => r.eventId === e.id)
    }))
})
