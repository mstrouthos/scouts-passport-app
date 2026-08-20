import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

export type SessionScout = typeof s.scouts.$inferSelect

export async function requireScout(event: H3Event): Promise<SessionScout> {
  const session = await requireUserSession(event)
  const id = (session.user as any)?.id
  const db = useDb()
  const row = id ? db.select().from(s.scouts).where(eq(s.scouts.id, id)).get() : null
  if (!row || !row.isActive) throw createError({ statusCode: 401, message: 'Not signed in' })
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

function myScopes(me: SessionScout) {
  return useDb().select().from(s.leaderScopes).where(eq(s.leaderScopes.scoutId, me.id)).all()
}

/** Coarsest grant a leader holds: admin (troop_leader) > troop > section > patrol > none. */
export function scopeKind(me: SessionScout): 'admin' | 'troop' | 'section' | 'patrol' | null {
  if (me.role === 'troop_leader') return 'admin'
  const scopes = myScopes(me)
  if (scopes.some(x => x.scope === 'troop')) return 'troop'
  if (scopes.some(x => x.scope === 'section')) return 'section'
  if (scopes.some(x => x.scope === 'patrol')) return 'patrol'
  return null
}

/** Patrol ids granted directly (patrol-level leaders — e.g. Αρχηγός/Υπαρχηγός Ενωμοτίας). */
export function directPatrolIds(me: SessionScout): number[] {
  return [...new Set(myScopes(me).filter(x => x.scope === 'patrol' && x.patrolId != null).map(x => x.patrolId!))]
}

/** Sections a leader may ADMINISTER: create events/challenges/announcements, add
    members, manage contacts, appoint patrol leaders. null = everything (admin/troop). */
export function scopedSectionIds(me: SessionScout): number[] | null {
  if (me.role === 'troop_leader') return null
  const scopes = myScopes(me)
  if (scopes.some(x => x.scope === 'troop')) return null
  return [...new Set(scopes.filter(x => x.scope === 'section' && x.sectionId != null).map(x => x.sectionId!))]
}

/** Sections that should render at all (administered sections, plus the parent
    section of any directly-granted patrol) — null = everything. */
export function visibleSectionIds(me: SessionScout): number[] | null {
  const secIds = scopedSectionIds(me)
  if (secIds === null) return null
  const patIds = directPatrolIds(me)
  if (!patIds.length) return secIds
  const patrols = useDb().select().from(s.patrols).all()
  const viaPatrol = patrols.filter(p => patIds.includes(p.id)).map(p => p.sectionId)
  return [...new Set([...secIds, ...viaPatrol])]
}

/** 'admin' | 'archigos' | 'yparchigos' of the leader's HIGHEST grant — used for the
    announcement approval gate (section/troop level only; patrol leaders never author). */
export function rankOf(me: SessionScout): 'admin' | 'archigos' | 'yparchigos' {
  if (me.role === 'troop_leader') return 'admin'
  const scopes = myScopes(me).filter(x => x.scope === 'troop' || x.scope === 'section')
  return scopes.some(x => x.rank === 'archigos') ? 'archigos' : 'yparchigos'
}

/** Effective section of any member row (own column, else via patrol). */
export function sectionOf(r: SessionScout, patrols?: Array<typeof s.patrols.$inferSelect>): number | null {
  if (r.sectionId != null) return r.sectionId
  if (r.patrolId == null) return null
  const list = patrols ?? useDb().select().from(s.patrols).all()
  return list.find(p => p.id === r.patrolId)?.sectionId ?? null
}

/** Patrol ids inside the leader's administered sections, plus any granted directly. null = all. */
export function scopedPatrolIds(me: SessionScout): number[] | null {
  const secs = scopedSectionIds(me)
  const patIds = directPatrolIds(me)
  if (secs === null) return null
  const inSections = useDb().select().from(s.patrols).all().filter(p => secs.includes(p.sectionId)).map(p => p.id)
  return [...new Set([...inSections, ...patIds])]
}

/** Members (role=scout) this leader manages: everyone in administered sections,
    plus (for patrol-level leaders) just their own patrol's members. */
export function scopedScouts(me: SessionScout) {
  const db = useDb()
  if (me.role === 'troop_leader') return db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')).all()
  const scopes = myScopes(me)
  if (scopes.some(x => x.scope === 'troop')) return db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')).all()
  const secIds = scopedSectionIds(me)
  const patIds = directPatrolIds(me)
  if (!secIds.length && !patIds.length) return []
  const patrols = db.select().from(s.patrols).all()
  const all = db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')).all()
  return all.filter(r => {
    const sid = sectionOf(r, patrols)
    if (sid != null && secIds.includes(sid)) return true
    if (r.patrolId != null && patIds.includes(r.patrolId)) return true
    return false
  })
}

export function assertScoutInScope(me: SessionScout, scoutId: number) {
  const ok = scopedScouts(me).some(r => r.id === scoutId)
  if (!ok) throw createError({ statusCode: 403, message: 'Out of your sector' })
}

/** Βαθμοφόροι this leader may view/edit. Troop leader: everyone but themself.
    Section-scope leader: only patrol-level leaders within their own section's
    patrols (mirrors the appoint rule in roles.post.ts). Patrol-only leaders
    manage nobody. */
export function scopedLeaders(me: SessionScout) {
  const db = useDb()
  const all = db.select().from(s.scouts).all().filter(r => r.role !== 'scout')
  if (me.role === 'troop_leader') return all.filter(r => r.id !== me.id)
  const secIds = scopedSectionIds(me)
  if (!secIds || !secIds.length) return []
  const myPatrols = db.select().from(s.patrols).all().filter(p => secIds.includes(p.sectionId)).map(p => p.id)
  const scopes = db.select().from(s.leaderScopes).all()
  const patrolLeaderIds = new Set(
    scopes.filter(x => x.scope === 'patrol' && x.patrolId != null && myPatrols.includes(x.patrolId)).map(x => x.scoutId)
  )
  return all.filter(r => patrolLeaderIds.has(r.id))
}

export function assertLeaderInScope(me: SessionScout, scoutId: number) {
  const ok = scopedLeaders(me).some(r => r.id === scoutId)
  if (!ok) throw createError({ statusCode: 403, message: 'Out of your sector' })
}

/** Total points per scout id: challenge answers + direct awards + patrol awards. */
export function pointTotals(): Map<number, number> {
  const db = useDb()
  const totals = new Map<number, number>()
  const add = (id: number, p: number) => totals.set(id, (totals.get(id) || 0) + p)
  for (const a of db.select().from(s.challengeAnswers).all()) add(a.scoutId, a.pointsAwarded)
  const actives = db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')).all().filter(r => r.isActive)
  for (const w of db.select().from(s.pointAwards).all()) {
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
