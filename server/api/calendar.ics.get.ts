import { useDb, schema as s } from '../db'
import { requireScout, sectionOf, visibleSectionIds } from '../utils/guard'
import { buildIcs } from '../utils/ics'

/** Authenticated person's calendar as a downloadable .ics.

    For a member this mirrors /api/calendar exactly. For a Βαθμοφόρος it has to
    do more: their own Βαθμοφόροι meetings belong in their phone's calendar too,
    and so do the sectors they run — which are not necessarily the one sector
    they happen to be filed under. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const isLeader = me.role === 'leader' || me.role === 'troop_leader'
  const mySection = await sectionOf(me)
  const visIds = isLeader ? await visibleSectionIds(me) : null
  const inMySectors = (sectionId: number | null) => {
    if (!isLeader) return sectionId === mySection
    if (visIds === null) return true                    // the whole troop
    return sectionId != null && (visIds.includes(sectionId) || sectionId === mySection)
  }
  const myGroups = (await db.select().from(s.notifyGroupMembers))
    .filter(m => m.scoutId === me.id).map(m => m.groupId)
  const rows = (await db.select().from(s.events))
    .filter(e => e.scope === 'troop'
      || (e.scope === 'leaders' && isLeader)
      || (e.scope === 'section' && inMySectors(e.sectionId))
      || (e.scope === 'patrol' && (e.patrolId === me.patrolId || (isLeader && inMySectors(e.sectionId))))
      || (e.scope === 'group' && e.groupId != null && myGroups.includes(e.groupId)))
    .filter(e => new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const ics = buildIcs(rows.map(e => ({
    uid: `event-${e.id}`, title: e.titleEl, location: e.location,
    description: [e.themeEl, e.descriptionEl].filter(Boolean).join('\n\n') || undefined,
    startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: !!e.isAllDay
  })), 'Πύλη Προσκόπων')

  setResponseHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="scout-calendar.ics"')
  return ics
})
