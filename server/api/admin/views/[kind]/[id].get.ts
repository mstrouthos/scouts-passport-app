import { and, eq, gt } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { leadersForEvent } from '../../../../utils/rsvp'
import { leadersOfSections } from '../../../../utils/polls'

/** For the administrators alone: of the Βαθμοφόροι a poll or an event asks,
    who was notified, who opened it (and whether from the notification), who
    answered — and so who saw it and did not answer, and who never opened it. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.role !== 'troop_leader') throw createError({ statusCode: 403, message: 'Μόνο για διαχειριστές' })
  const kind = getRouterParam(event, 'kind')
  if (kind !== 'poll' && kind !== 'event') throw createError({ statusCode: 400, message: 'Bad kind' })
  const id = idParam(event)
  const db = await useDb()

  let asked: number[] = [], answered = new Set<number>()
  if (kind === 'event') {
    const ev = (await db.select().from(s.events).where(eq(s.events.id, id)).limit(1))[0]
    if (!ev) throw createError({ statusCode: 404, message: 'Not found' })
    asked = await leadersForEvent(ev)
    answered = new Set((await db.select().from(s.eventRsvps).where(eq(s.eventRsvps.eventId, id))).map(r => r.scoutId))
  } else {
    const p = (await db.select().from(s.polls).where(eq(s.polls.id, id)).limit(1))[0]
    if (!p) throw createError({ statusCode: 404, message: 'Not found' })
    asked = await leadersOfSections(p.sectionId)
    answered = new Set((await db.select().from(s.pollVotes).where(eq(s.pollVotes.pollId, id))).map(v => v.scoutId))
  }
  const views = await db.select().from(s.contentViews).where(and(eq(s.contentViews.kind, kind), eq(s.contentViews.refId, id)))
  const notified = new Set((await db.select().from(s.notificationLog)
    .where(and(eq(s.notificationLog.kind, kind === 'event' ? 'eventRsvp' : 'poll'), eq(s.notificationLog.refId, id), gt(s.notificationLog.scoutId, 0))))
    .map(n => n.scoutId))
  const people = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && !r.isHidden)
  const ids = [...new Set([...asked, ...views.map(v => v.scoutId), ...answered])]
  const rows = ids.map(pid => {
    const p = people.find(x => x.id === pid)
    const v = views.find(x => x.scoutId === pid)
    return p && {
      id: pid, firstName: p.firstName, lastName: p.lastName,
      notified: notified.has(pid), sawAt: v?.firstAt ?? null, lastAt: v?.lastAt ?? null,
      fromNotification: !!v?.fromNotificationAt, answered: answered.has(pid)
    }
  }).filter(Boolean) as any[]
  rows.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'el'))
  return {
    asked: rows.length,
    answered: rows.filter(r => r.answered),
    seenNoAnswer: rows.filter(r => r.sawAt && !r.answered),
    notSeen: rows.filter(r => !r.sawAt && !r.answered),
    seen: rows.filter(r => r.sawAt).length,
    fromNotification: rows.filter(r => r.fromNotification).length
  }
})
