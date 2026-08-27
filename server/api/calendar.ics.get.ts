import { useDb, schema as s } from '../db'
import { requireScout, sectionOf } from '../utils/guard'
import { buildIcs } from '../utils/ics'

/** Authenticated scout's calendar as a downloadable .ics — same visibility rules as /api/calendar. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const mySection = await sectionOf(me)
  // the same rule as /api/calendar: their own sector's programme, their unit's,
  // and any group they belong to
  const myGroups = (await db.select().from(s.notifyGroupMembers))
    .filter(m => m.scoutId === me.id).map(m => m.groupId)
  const rows = (await db.select().from(s.events))
    .filter(e => e.scope === 'troop'
      || (e.scope === 'section' && e.sectionId === mySection)
      || (e.scope === 'patrol' && e.patrolId === me.patrolId)
      || (e.scope === 'group' && e.groupId != null && myGroups.includes(e.groupId)))
    .filter(e => new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const ics = buildIcs(rows.map(e => ({
    uid: `event-${e.id}`, title: e.titleEl, location: e.location,
    startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: !!e.isAllDay
  })), 'Πύλη Προσκόπων')

  setResponseHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="scout-calendar.ics"')
  return ics
})
