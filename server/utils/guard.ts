import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { passcodeVersion } from './passcode'

export type SessionScout = typeof s.scouts.$inferSelect
type Patrol = typeof s.patrols.$inferSelect

export async function requireScout(event: H3Event): Promise<SessionScout> {
  const session = await requireUserSession(event)
  const id = (session.user as any)?.id
  const db = await useDb()
  const row = id ? (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0] : null
  if (!row || !row.isActive) throw createError({ statusCode: 401, message: 'Not signed in' })
  // Sessions issued before this check have no `pv` and are left alone; any
  // session that carries one must still match the passcode on file.
  const pv = (session.user as any)?.pv
  if (pv && pv !== passcodeVersion(row.passcodeHmac))
    throw createError({ statusCode: 401, message: 'Passcode changed — sign in again' })
  return row
}

export async function requireLeader(event: H3Event): Promise<SessionScout> {
  const me = await requireScout(event)
  if (me.role !== 'leader' && me.role !== 'troop_leader')
    throw createError({ statusCode: 403, message: 'Leaders only' })
  return me
}

export async function requireTroopLeader(event: H3Event): Promise<SessionScout> {
  const me = await requireScout(event)
  if (me.role !== 'troop_leader')
    throw createError({ statusCode: 403, message: 'Troop leader only' })
  return me
}

async function myScopes(me: SessionScout) {
  const db = await useDb()
  return db.select().from(s.leaderScopes).where(eq(s.leaderScopes.scoutId, me.id))
}

/** Coarsest grant a leader holds: admin (troop_leader) > troop > section > patrol > none. */
export async function scopeKind(me: SessionScout): Promise<'admin' | 'troop' | 'section' | 'patrol' | null> {
  if (me.role === 'troop_leader') return 'admin'
  const scopes = await myScopes(me)
  if (scopes.some(x => x.scope === 'troop')) return 'troop'
  if (scopes.some(x => x.scope === 'section')) return 'section'
  if (scopes.some(x => x.scope === 'patrol')) return 'patrol'
  return null
}

/** Patrol ids granted directly (patrol-level leaders — e.g. Αρχηγός/Υπαρχηγός Ενωμοτίας). */
export async function directPatrolIds(me: SessionScout): Promise<number[]> {
  const scopes = await myScopes(me)
  return [...new Set(scopes.filter(x => x.scope === 'patrol' && x.patrolId != null).map(x => x.patrolId!))]
}

/** Sections a leader may ADMINISTER: create events/challenges/announcements, add
    members, manage contacts, appoint patrol leaders. null = everything (admin/troop). */
export async function scopedSectionIds(me: SessionScout): Promise<number[] | null> {
  if (me.role === 'troop_leader') return null
  const scopes = await myScopes(me)
  if (scopes.some(x => x.scope === 'troop')) return null
  return [...new Set(scopes.filter(x => x.scope === 'section' && x.sectionId != null).map(x => x.sectionId!))]
}

/** Sections that should render at all (administered sections, plus the parent
    section of any directly-granted patrol) — null = everything. */
export async function visibleSectionIds(me: SessionScout): Promise<number[] | null> {
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return null
  const patIds = await directPatrolIds(me)
  if (!patIds.length) return secIds
  const db = await useDb()
  const patrols = await db.select().from(s.patrols)
  const viaPatrol = patrols.filter(p => patIds.includes(p.id)).map(p => p.sectionId)
  return [...new Set([...secIds, ...viaPatrol])]
}

/** 'admin' | 'archigos' | 'yparchigos' of the leader's HIGHEST grant — used for the
    announcement approval gate (section/troop level only; patrol leaders never author). */
export async function rankOf(me: SessionScout): Promise<'admin' | 'archigos' | 'yparchigos'> {
  if (me.role === 'troop_leader') return 'admin'
  const scopes = (await myScopes(me)).filter(x => x.scope === 'troop' || x.scope === 'section')
  return scopes.some(x => x.rank === 'archigos') ? 'archigos' : 'yparchigos'
}

/** Effective section of any member row (own column, else via patrol). Pass the
    patrol list in when resolving many rows, to avoid a query per row. */
export async function sectionOf(r: SessionScout, patrols?: Patrol[]): Promise<number | null> {
  if (r.sectionId != null) return r.sectionId
  if (r.patrolId == null) return null
  const list = patrols ?? await (await useDb()).select().from(s.patrols)
  return list.find(p => p.id === r.patrolId)?.sectionId ?? null
}

/** Synchronous variant for when the caller already has the patrol list. */
export function sectionOfWith(r: SessionScout, patrols: Patrol[]): number | null {
  if (r.sectionId != null) return r.sectionId
  if (r.patrolId == null) return null
  return patrols.find(p => p.id === r.patrolId)?.sectionId ?? null
}

/** Patrol ids inside the leader's administered sections, plus any granted directly. null = all. */
export async function scopedPatrolIds(me: SessionScout): Promise<number[] | null> {
  const secs = await scopedSectionIds(me)
  const patIds = await directPatrolIds(me)
  if (secs === null) return null
  const db = await useDb()
  const inSections = (await db.select().from(s.patrols)).filter(p => secs.includes(p.sectionId)).map(p => p.id)
  return [...new Set([...inSections, ...patIds])]
}

/** Members (role=scout) this leader manages: everyone in administered sections,
    plus (for patrol-level leaders) just their own patrol's members. */
export async function scopedScouts(me: SessionScout): Promise<SessionScout[]> {
  const db = await useDb()
  const allScouts = () => db.select().from(s.scouts).where(eq(s.scouts.role, 'scout'))
  if (me.role === 'troop_leader') return allScouts()
  const scopes = await myScopes(me)
  if (scopes.some(x => x.scope === 'troop')) return allScouts()
  const secIds = await scopedSectionIds(me)
  const patIds = await directPatrolIds(me)
  if (!secIds!.length && !patIds.length) return []
  const patrols = await db.select().from(s.patrols)
  const all = await allScouts()
  return all.filter(r => {
    const sid = sectionOfWith(r, patrols)
    if (sid != null && secIds!.includes(sid)) return true
    if (r.patrolId != null && patIds.includes(r.patrolId)) return true
    return false
  })
}

export async function assertScoutInScope(me: SessionScout, scoutId: number) {
  const ok = (await scopedScouts(me)).some(r => r.id === scoutId)
  if (!ok) throw createError({ statusCode: 403, message: 'Out of your sector' })
}

/** Βαθμοφόροι this leader may view/edit. Troop leader: everyone but themself.
    Section-scope leader: only patrol-level leaders within their own section's
    patrols (mirrors the appoint rule in roles.post.ts). Patrol-only leaders
    manage nobody. */
export async function scopedLeaders(me: SessionScout): Promise<SessionScout[]> {
  const db = await useDb()
  const all = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout')
  if (me.role === 'troop_leader') return all.filter(r => r.id !== me.id)
  const secIds = await scopedSectionIds(me)
  if (!secIds || !secIds.length) return []
  const myPatrols = (await db.select().from(s.patrols)).filter(p => secIds.includes(p.sectionId)).map(p => p.id)
  const scopes = await db.select().from(s.leaderScopes)
  const patrolLeaderIds = new Set(
    scopes.filter(x => x.scope === 'patrol' && x.patrolId != null && myPatrols.includes(x.patrolId)).map(x => x.scoutId)
  )
  return all.filter(r => patrolLeaderIds.has(r.id))
}

export async function assertLeaderInScope(me: SessionScout, scoutId: number) {
  const ok = (await scopedLeaders(me)).some(r => r.id === scoutId)
  if (!ok) throw createError({ statusCode: 403, message: 'Out of your sector' })
}

/** Total points per scout id: challenge answers + direct awards + patrol awards. */
export async function pointTotals(): Promise<Map<number, number>> {
  const db = await useDb()
  const totals = new Map<number, number>()
  const add = (id: number, p: number) => totals.set(id, (totals.get(id) || 0) + p)
  for (const a of await db.select().from(s.challengeAnswers)) add(a.scoutId, a.pointsAwarded)
  const actives = (await db.select().from(s.scouts).where(eq(s.scouts.role, 'scout'))).filter(r => r.isActive)
  for (const w of await db.select().from(s.pointAwards)) {
    if (w.scoutId) add(w.scoutId, w.points)
    else if (w.patrolId) for (const r of actives.filter(x => x.patrolId === w.patrolId)) add(r.id, w.points)
  }
  return totals
}

export function idParam(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad id' })
  return id
}
