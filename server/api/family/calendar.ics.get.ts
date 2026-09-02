import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { buildIcs } from '../../utils/ics'

/** A signed-in parent's diary as .ics, for their phone's calendar.

    ?section=<id> keeps it to one child's sector (plus the troop's), which is
    how the page is read; without it, every sector their children are in.
    ?event=<id> downloads that one event alone. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = (await useDb())
  const q = getQuery(event)
  const only = q.section != null ? Number(q.section) : null
  if (only != null && !p.sectionIds.includes(only))
    throw createError({ statusCode: 403, message: 'Not your child\'s sector' })
  const sectionIds = only != null ? [only] : p.sectionIds
  const one = q.event != null ? Number(q.event) : null

  const rows = (await db.select().from(s.events))
    .filter(e => e.scope !== 'leaders')
    .filter(e => e.scope === 'troop' || (e.scope === 'section' && e.sectionId != null && sectionIds.includes(e.sectionId)))
    .filter(e => one == null ? new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000 : e.id === one)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  if (one != null && !rows.length) throw createError({ statusCode: 404, message: 'Not found' })

  const secName = only != null ? (await db.select().from(s.sections)).find(x => x.id === only)?.nameEl : null
  const ics = buildIcs(rows.map(e => ({
    uid: `event-${e.id}`, title: e.titleEl, location: e.location,
    description: [e.themeEl, e.descriptionEl].filter(Boolean).join('\n\n') || undefined,
    startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: !!e.isAllDay
  })), secName ? `Πύλη Προσκόπων — ${secName}` : 'Πύλη Προσκόπων')

  setResponseHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${one != null ? `event-${one}` : 'scout-calendar'}.ics"`)
  return ics
})
