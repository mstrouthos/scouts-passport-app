import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { mayRsvp } from '../../../../utils/rsvp'
import { now } from '../../../../utils/passcode'

/** A Βαθμοφόρος says whether they are coming. Their own answer only — nobody
    answers on anyone else's behalf. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const eventId = idParam(event)
  const db = await useDb()
  const ev = (await db.select().from(s.events).where(eq(s.events.id, eventId)).limit(1))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Event not found' })
  if (!(await mayRsvp(me, ev)))
    throw createError({ statusCode: 403, message: 'Η δράση δεν σε αφορά' })

  const b = await readBody<{ answer?: string, noteEl?: string }>(event)
  const answer = ['yes', 'no', 'maybe'].includes(b?.answer as any) ? b!.answer as any : null
  if (!answer) throw createError({ statusCode: 400, message: 'Bad answer' })
  const noteEl = b?.noteEl ? String(b.noteEl).slice(0, 300) : null

  const existing = (await db.select().from(s.eventRsvps)
    .where(and(eq(s.eventRsvps.eventId, eventId), eq(s.eventRsvps.scoutId, me.id))).limit(1))[0]
  if (existing) await db.update(s.eventRsvps).set({ answer, noteEl, answeredAt: now() }).where(eq(s.eventRsvps.id, existing.id))
  else await db.insert(s.eventRsvps).values({ eventId, scoutId: me.id, answer, noteEl, answeredAt: now() })
  return { ok: true, answer }
})
