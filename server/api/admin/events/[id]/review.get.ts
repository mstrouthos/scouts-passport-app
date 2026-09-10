import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam, rankOf, sectionOfWith, canSeeHidden } from '../../../../utils/guard'
import { groupMemberIds, canScheduleForGroup } from '../../../../utils/groupScope'
import { canEditEvent } from '../../../../utils/eventScope'
import { leadersForEvent, sectionsOfLeader } from '../../../../utils/rsvp'
import { scopedSectionIds } from '../../../../utils/guard'

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
  // The roll is the event's own people, not everyone the leader happens to
  // manage: opening another sector's συγκέντρωση must not offer your own
  // members to mark present at it.
  const ofEvent = (r: typeof s.scouts.$inferSelect) => {
    if (e.scope === 'troop' || e.scope === 'leaders') return true
    if (e.sectionId == null) return true
    return sectionOfWith(r as any, patrols) === e.sectionId
  }
  // Whose attendance this event records, and who may record it:
  //  · a Βαθμοφόροι event lists the Βαθμοφόροι it concerns, marked by whoever
  //    may edit the event;
  //  · a troop-wide event lists everyone, but each Αρχηγός marks only their
  //    own sector's members — the rest are shown, greyed;
  //  · a sector's event lists that sector's members, as before.
  const asked = await leadersForEvent(e)
  // a hidden test account is on nobody's roll but the Αρχηγός Συστήματος's —
  // a troop-wide event lists everyone, which would otherwise name it aloud
  const everyone = (await db.select().from(s.scouts)).filter(r => !r.isHidden || canSeeHidden(me))
  const mine = new Set((await scopedScouts(me)).map(r => r.id))
  const editable = await canEditEvent(me, e)
  let roster: Array<typeof s.scouts.$inferSelect & { canMark: boolean }>
  if (e.scope === 'leaders') {
    const ids = new Set(asked)
    roster = everyone.filter(r => ids.has(r.id)).map(r => ({ ...r, canMark: editable }))
  } else if (runsGroup) {
    roster = everyone.filter(r => r.role === 'scout' && onlyGroup!.has(r.id)).map(r => ({ ...r, canMark: true }))
  } else if (e.scope === 'troop') {
    roster = everyone.filter(r => r.role === 'scout').map(r => ({ ...r, canMark: mine.has(r.id) }))
  } else {
    roster = everyone.filter(r => r.role === 'scout' && mine.has(r.id) && (!onlyGroup || onlyGroup.has(r.id)) && ofEvent(r))
      .map(r => ({ ...r, canMark: true }))
  }
  // who among the Βαθμοφόροι this concerns, and what each of them said.
  // Who is coming: the Αρχηγός Συστήματος reads the whole roll, a sector's
  // Αρχηγός only the Βαθμοφόροι of their own sectors, and a Υπαρχηγός none of
  // it — they still answer for themselves.
  const myRank = await rankOf(me)
  const mySections = await scopedSectionIds(me)
  const rsvps = await db.select().from(s.eventRsvps).where(eq(s.eventRsvps.eventId, eventId))
  const people = await db.select().from(s.scouts)
  const visibleToMe = async (leaderId: number) => {
    if (myRank === 'admin' || mySections === null) return true
    if (myRank === 'yparchigos') return false
    const theirs = await sectionsOfLeader(leaderId)
    // a troop-wide Βαθμοφόρος is nobody's sector to inspect
    if (theirs === null) return false
    return theirs.some(sec => mySections.includes(sec))
  }
  const allowed = new Set<number>()
  for (const id of asked) if (await visibleToMe(id)) allowed.add(id)
  const seesRoll = myRank !== 'yparchigos' && allowed.size > 0

  const rsvpRows = asked.filter(id => allowed.has(id)).map(id => {
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
    event: {
      id: e.id, titleEl: e.titleEl, titleEn: e.titleEn, startsAt: e.startsAt, scope: e.scope, groupId: e.groupId,
      // the sector decides the words on this screen: an Αγέλη game is won by an εξάδα
      sectionId: e.sectionId,
      sectionSlug: e.sectionId != null ? (await db.select().from(s.sections)).find(x => x.id === e.sectionId)?.slug ?? null : null
    },
    scouts: roster.filter(r => r.isActive).sort((a, b) => (a.sectionId ?? 0) - (b.sectionId ?? 0)).map(r => {
      const rev = reviews.find(x => x.scoutId === r.id)
      return {
        id: r.id, firstName: r.firstName, lastName: r.lastName,
        firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, patrolId: r.patrolId,
        canMark: r.canMark,
        attendance: rev?.attendance ?? null, uniform: rev?.uniform ?? null
      }
    }),
    patrols: patrols.map(p => ({ id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem, sectionId: p.sectionId })),
    gameAwards: awards.map(a => ({
      patrolId: a.patrolId, scoutId: a.scoutId, points: a.points, reasonEl: a.reasonEl, reasonEn: a.reasonEn
    }))
  }
})
