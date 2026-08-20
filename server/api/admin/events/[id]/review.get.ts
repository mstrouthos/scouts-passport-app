import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam } from '../../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const eventId = idParam(event)
  const db = useDb()
  const e = db.select().from(s.events).where(eq(s.events.id, eventId)).get()
  if (!e) throw createError({ statusCode: 404, message: 'Event not found' })
  const reviews = db.select().from(s.eventReviews).where(eq(s.eventReviews.eventId, eventId)).all()
  const awards = db.select().from(s.pointAwards).where(eq(s.pointAwards.eventId, eventId)).all()
    .filter(a => a.kind === 'game')
  const patrols = db.select().from(s.patrols).all()
  return {
    event: { id: e.id, titleEl: e.titleEl, titleEn: e.titleEn, startsAt: e.startsAt, scope: e.scope },
    scouts: scopedScouts(me).filter(r => r.isActive).map(r => {
      const rev = reviews.find(x => x.scoutId === r.id)
      return {
        id: r.id, firstName: r.firstName, lastName: r.lastName,
        firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, patrolId: r.patrolId,
        attendance: rev?.attendance ?? null, uniform: rev?.uniform ?? null
      }
    }),
    patrols: patrols.map(p => ({ id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem })),
    gameAwards: awards.map(a => ({
      patrolId: a.patrolId, points: a.points, reasonEl: a.reasonEl, reasonEn: a.reasonEn
    }))
  }
})
