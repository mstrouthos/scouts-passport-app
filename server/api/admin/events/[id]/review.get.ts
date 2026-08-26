import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam, rankOf } from '../../../../utils/guard'
import { groupMemberIds, canScheduleForGroup } from '../../../../utils/groupScope'
import { leadersForEvent } from '../../../../utils/rsvp'

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
  // a group's meeting is registered against the group, not the whole sector:
  // marking the band present should not list everyone who is not in the band
  const isGroupEvent = e.scope === 'group' && e.groupId != null
  const onlyGroup = isGroupEvent ? new Set(await groupMemberIds(e.groupId!)) : null
  // whoever runs the group registers the whole group, even the members who sit
  // in a sector they do not otherwise manage
  const runsGroup = isGroupEvent && await canScheduleForGroup(me, e.groupId!)
  const roster = runsGroup
    ? (await db.select().from(s.scouts)).filter(r => r.role === 'scout' && onlyGroup!.has(r.id))
    : (await scopedScouts(me)).filter(r => !onlyGroup || onlyGroup.has(r.id))
  // who among the Βαθμοφόροι this concerns, and what each of them said.
  // Who is coming is the Αρχηγός Συστήματος's business and the organiser's —
  // everyone else answers for themselves without seeing the roll.
  const asked = await leadersForEvent(e)
  const seesRoll = (await rankOf(me)) === 'admin' || e.createdBy === me.id
  const rsvps = await db.select().from(s.eventRsvps).where(eq(s.eventRsvps.eventId, eventId))
  const people = await db.select().from(s.scouts)
  const rsvpRows = asked.map(id => {
    const r = people.find(x => x.id === id)!
    const a = rsvps.find(x => x.scoutId === id)
    return {
      id, firstName: r.firstName, lastName: r.lastName,
      firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
      answer: a?.answer ?? null, noteEl: a?.noteEl ?? null
    }
  }).sort((a, b) => a.firstName.localeCompare(b.firstName, 'el'))

  return {
    rsvps: seesRoll ? rsvpRows : [],
    seesRoll,
    myRsvp: rsvps.find(x => x.scoutId === me.id)?.answer ?? null,
    canRsvp: asked.includes(me.id),
    event: { id: e.id, titleEl: e.titleEl, titleEn: e.titleEn, startsAt: e.startsAt, scope: e.scope, groupId: e.groupId },
    scouts: roster.filter(r => r.isActive).map(r => {
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
