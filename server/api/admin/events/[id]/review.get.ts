import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam } from '../../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const eventId = idParam(event)
  const db = (await useDb())
  const e = (await db.select().from(s.events).where(eq(s.events.id, eventId)).limit(1))[0]
  if (!e) throw createError({ statusCode: 404, message: 'Event not found' })
  const reviews = (await db.select().from(s.eventReviews).where(eq(s.eventReviews.eventId, eventId)))
  const awards = (await db.select().from(s.pointAwards).where(eq(s.pointAwards.eventId, eventId)))
    .filter(a => a.kind === 'game')
  const patrols = (await db.select().from(s.patrols))
  return {
    event: { id: e.id, titleEl: e.titleEl, titleEn: e.titleEn, startsAt: e.startsAt, scope: e.scope },
    scouts: (await scopedScouts(me)).filter(r => r.isActive).map(r => {
      const rev = reviews.find(x => x.scoutId === r.id)
      return {
        id: r.id, firstName: r.firstName, lastName: r.lastName,
        firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, patrolId: r.patrolId,
        attendance: rev?.attendance ?? null, uniform: rev?.uniform ?? null
      }
    }),
    patrols: patrols.map(p => ({ id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem })),
    gameAwards: awards.map(a => ({
      patrolId: a.patrolId, scoutId: a.scoutId, points: a.points, reasonEl: a.reasonEl, reasonEn: a.reasonEn
    }))
  }
})
