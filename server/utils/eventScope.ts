import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { scopedSectionIds, type SessionScout } from './guard'
import { canScheduleForGroup } from './groupScope'

/** Load an event and assert the leader may manage it: full access sees all,
    a sector leader only their own section's (troop-wide events stay with the
    Αρχηγός Συστήματος, mirroring events.post.ts). */
export async function eventInScope(me: SessionScout, id: number) {
  const db = (await useDb())
  const ev = (await db.select().from(s.events).where(eq(s.events.id, id)).limit(1))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return ev
  // a group's own meeting belongs to whoever runs the group
  if (ev.scope === 'group' && ev.groupId != null) {
    if (await canScheduleForGroup(me, ev.groupId)) return ev
    throw createError({ statusCode: 403, message: 'You do not run that group' })
  }
  if (ev.sectionId == null || !secIds.includes(ev.sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  return ev
}

/** Has anything been recorded against this event that would be lost? */
export async function eventHasData(id: number) {
  const db = (await useDb())
  const reviews = (await db.select().from(s.eventReviews).where(eq(s.eventReviews.eventId, id)))
    .filter(r => r.attendance != null || r.uniform != null)
  const awards = await db.select().from(s.pointAwards).where(eq(s.pointAwards.eventId, id))
  return { reviews: reviews.length, awards: awards.length, any: reviews.length > 0 || awards.length > 0 }
}
