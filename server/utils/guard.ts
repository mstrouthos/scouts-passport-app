import type { H3Event } from 'h3'
import { eq, inArray } from 'drizzle-orm'
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

/** Patrol ids a leader may manage; null = everything (troop leader / troop scope). */
export function scopedPatrolIds(me: SessionScout): number[] | null {
  if (me.role === 'troop_leader') return null
  const db = useDb()
  const scopes = db.select().from(s.leaderScopes).where(eq(s.leaderScopes.scoutId, me.id)).all()
  if (scopes.some(x => x.scope === 'troop' || x.scope === 'section')) return null
  const ids = scopes.filter(x => x.scope === 'patrol' && x.patrolId != null).map(x => x.patrolId!)
  return ids.length ? ids : []
}

/** Scouts (role=scout) this leader manages. */
export function scopedScouts(me: SessionScout) {
  const db = useDb()
  const pids = scopedPatrolIds(me)
  const all = db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')).all()
  return pids === null ? all : all.filter(r => r.patrolId != null && pids.includes(r.patrolId))
}

export function assertScoutInScope(me: SessionScout, scoutId: number) {
  const ok = scopedScouts(me).some(r => r.id === scoutId)
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
