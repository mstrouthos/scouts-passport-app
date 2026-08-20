import { useDb, schema as s } from '../db'
import { requireScout, sectionOf } from '../utils/guard'
import { buildIcs } from '../utils/ics'

/** Authenticated scout's calendar as a downloadable .ics — same visibility rules as /api/calendar. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const mySection = await sectionOf(me)
  const rows = (await db.select().from(s.events))
    .filter(e => e.scope === 'troop'
      || (e.scope === 'section' && e.sectionId === mySection)
      || (e.scope === 'patrol' && e.patrolId === me.patrolId))
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
