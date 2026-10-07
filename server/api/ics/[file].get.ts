import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { buildIcs } from '../../utils/ics'
import { icsEventId } from '../../utils/icsLink'

/** One event, for the phone's calendar: /api/ics/<id>-<signature>.ics */
export default defineEventHandler(async (event) => {
  const id = icsEventId(String(getRouterParam(event, 'file') || ''))
  if (id == null) throw createError({ statusCode: 404, message: 'Not found' })
  const db = await useDb()
  const ev = (await db.select().from(s.events).where(eq(s.events.id, id)).limit(1))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Not found' })
  setResponseHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  // inline: iOS shows "Add to Calendar" rather than a download
  setResponseHeader(event, 'Content-Disposition', `inline; filename="event-${ev.id}.ics"`)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return buildIcs([{
    uid: `event-${ev.id}`, title: ev.titleEl, location: ev.location,
    description: [ev.themeEl, ev.descriptionEl].filter(Boolean).join('\n\n') || undefined,
    startsAt: ev.startsAt, endsAt: ev.endsAt, isAllDay: !!ev.isAllDay
  }], 'Πύλη Προσκόπων')
})
