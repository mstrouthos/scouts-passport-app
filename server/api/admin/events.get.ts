import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'
import { visibleGroupIds } from '../../utils/groupScope'
import { leadersMeetingOf, eventInSections, eventSectionIds } from '../../utils/eventScope'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  // full-access leaders see every sector; everyone else sees their own
  // sectors plus what is for the whole troop or for Βαθμοφόροι
  // An Αρχηγός reads every sector's diary so the sectors can coordinate; a
  // Υπαρχηγός stays with their own, the troop's and the Βαθμοφόροι's. What
  // they may EDIT is unchanged either way.
  const seeAll = secIds === null || (await rankOf(me)) === 'archigos'
  const myGroups = await visibleGroupIds(me)
  const reviews = (await db.select().from(s.eventReviews))
  const sections = new Map((await db.select().from(s.sections)).map(x => [x.id, x]))
  return (await db.select().from(s.events))
    .filter(e => e.scope === 'leaders' ? leadersMeetingOf(e, secIds)
      : seeAll || e.scope === 'troop'
      || (e.scope === 'group' && e.groupId != null && (myGroups ?? []).includes(e.groupId))
      || (e.scope !== 'group' && eventInSections(e, secIds!)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(e => {
      // a shared event names every sector it is for
      const secs = (e.scope === 'section' ? eventSectionIds(e) : e.sectionId != null ? [e.sectionId] : []).map(x => sections.get(x)).filter(Boolean) as any[]
      return {
        id: e.id, scope: e.scope, sectionId: e.sectionId, sectionIds: eventSectionIds(e), patrolId: e.patrolId,
        sectionEl: secs.length ? [...secs.map(x => x.nameEl), ...(e.withLeaders ? ['Βαθμοφόροι'] : [])].join(' + ') : null,
        sectionEn: secs.length ? [...secs.map(x => x.nameEn || x.nameEl), ...(e.withLeaders ? ['Leaders'] : [])].join(' + ') : null,
        withLeaders: !!e.withLeaders,
        titleEl: e.titleEl, titleEn: e.titleEn, location: e.location,
        startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay, remindAt: e.remindAt,
        tracksAttendance: e.tracksAttendance,
        groupId: e.groupId,
        editable: secIds === null
          || (e.scope === 'group' && e.groupId != null && (myGroups ?? []).includes(e.groupId))
          || e.createdBy === me.id
          || (e.scope !== 'group' && eventInSections(e, secIds)),
        reviewed: reviews.some(r => r.eventId === e.id)
      }
    })
})
