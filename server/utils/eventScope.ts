import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { scopedSectionIds, rankOf, type SessionScout } from './guard'
import { canScheduleForGroup } from './groupScope'

type Ev = typeof s.events.$inferSelect

/** The sectors an event is for: its own, and any it is shared with. Empty for
    one that is for the whole troop (or a Βαθμοφόροι meeting of them all). */
export function eventSectionIds(ev: Pick<Ev, 'sectionId' | 'extraSectionIds'>): number[] {
  const out = ev.sectionId != null ? [ev.sectionId] : []
  if (ev.extraSectionIds) {
    try { for (const x of JSON.parse(ev.extraSectionIds)) if (Number.isInteger(x) && !out.includes(x)) out.push(x) } catch {}
  }
  return out
}
/** Whether an event is for one of these sectors. */
export const eventInSections = (ev: Pick<Ev, 'sectionId' | 'extraSectionIds'>, secIds: number[]) =>
  eventSectionIds(ev).some(x => secIds.includes(x))

/** Load an event and assert the leader may manage it: full access sees all,
    a sector leader those of (or shared with) their own sectors, and any they
    made themselves — a whole-troop one, say. */
export async function eventInScope(me: SessionScout, id: number) {
  const db = (await useDb())
  const ev = (await db.select().from(s.events).where(eq(s.events.id, id)).limit(1))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return ev
  // a group's own meeting belongs to whoever runs the group
  if (ev.scope === 'group' && ev.groupId != null) {
    if (await canScheduleForGroup(me, ev.groupId)) return ev
    throw createError({ statusCode: 403, message: 'You do not run that group' })
  }
  // one they made (a whole-troop one, say), or one shared with their sector
  if (ev.createdBy === me.id || eventInSections(ev, secIds)) return ev
  throw createError({ statusCode: 403, message: 'Out of your sector' })
}

/** A Βαθμοφόροι meeting called for one sector is that sector's Βαθμοφόροι's
    alone (and the troop-wide leaders'); nobody else's diary lists it. */
export function leadersMeetingOf(ev: { scope: string; sectionId: number | null }, secIds: number[] | null) {
  if (ev.scope !== 'leaders') return true
  if (secIds === null || ev.sectionId == null) return true
  return secIds.includes(ev.sectionId)
}

/** May this leader edit the event? Same rule as eventInScope, without throwing. */
export async function canEditEvent(me: SessionScout, ev: typeof s.events.$inferSelect) {
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return true
  if (ev.scope === 'group' && ev.groupId != null) return canScheduleForGroup(me, ev.groupId)
  return ev.createdBy === me.id || eventInSections(ev, secIds)
}

/** Load an event this leader may READ. An Αρχηγός sees every sector's diary so
    the sectors can coordinate; a Υπαρχηγός stays with their own, the troop's
    and the Βαθμοφόροι's. Reading is not editing — see canEditEvent. */
export async function eventVisible(me: SessionScout, id: number) {
  const db = (await useDb())
  const ev = (await db.select().from(s.events).where(eq(s.events.id, id)).limit(1))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return ev
  if (ev.scope === 'leaders') {
    if (leadersMeetingOf(ev, secIds)) return ev
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  }
  if ((await rankOf(me)) === 'archigos') return ev
  if (ev.scope === 'troop') return ev
  if (ev.scope === 'group' && ev.groupId != null && await canScheduleForGroup(me, ev.groupId)) return ev
  if (eventInSections(ev, secIds)) return ev
  throw createError({ statusCode: 403, message: 'Out of your sector' })
}

/** Has anything been recorded against this event that would be lost? */
export async function eventHasData(id: number) {
  const db = (await useDb())
  const reviews = (await db.select().from(s.eventReviews).where(eq(s.eventReviews.eventId, id)))
    .filter(r => r.attendance != null || r.uniform != null)
  const awards = await db.select().from(s.pointAwards).where(eq(s.pointAwards.eventId, id))
  return { reviews: reviews.length, awards: awards.length, any: reviews.length > 0 || awards.length > 0 }
}

/** The sectors chosen for a sector event, checked: real ones, at least one,
    and — for a leader of some sectors only — at least one of their own (they
    may share their event with other sectors, never set one for others alone).
    The first of their own becomes the event's sector; the rest go beside it. */
export async function sectorsForEvent(secIds: number[] | null, body: { sectionIds?: unknown, sectionId?: unknown }) {
  const db = await useDb()
  const real = new Set((await db.select({ id: s.sections.id }).from(s.sections)).map(x => x.id))
  const asked = Array.isArray(body.sectionIds) ? body.sectionIds : body.sectionId != null ? [body.sectionId] : []
  const chosen = [...new Set(asked.map(Number))].filter(x => real.has(x))
  if (!chosen.length) throw createError({ statusCode: 400, message: 'Διαλέξτε τομέα' })
  if (secIds !== null && !chosen.some(x => secIds.includes(x)))
    throw createError({ statusCode: 403, message: 'Επιλέξτε και τον δικό σας τομέα' })
  const main = secIds === null ? chosen[0] : chosen.find(x => secIds.includes(x))!
  const rest = chosen.filter(x => x !== main)
  return { sectionId: main, extraSectionIds: rest.length ? JSON.stringify(rest) : null }
}
