import { useDb, schema as s } from '../../db'
import { buildIcs } from '../../utils/ics'

/** Public parents' calendar as a downloadable .ics, scoped by section slug. */
export default defineEventHandler(async (event) => {
  const db = (await useDb())
  const slug = String(getQuery(event).section || '')
  const famSections = (await db.select().from(s.sections)).filter(x => !x.hasApp)
  const current = famSections.find(x => x.slug === slug) || famSections[0]
  if (!current) throw createError({ statusCode: 404, message: 'No family sections' })

  const rows = (await db.select().from(s.events))
    .filter(e => e.scope === 'troop' || (e.scope === 'section' && e.sectionId === current.id))
    .filter(e => new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const ics = buildIcs(rows.map(e => ({
    uid: `event-${e.id}`, title: e.titleEl, location: e.location,
    startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: !!e.isAllDay
  })), `Πύλη Προσκόπων — ${current.nameEl}`)

  setResponseHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="scout-calendar.ics"')
  return ics
})
