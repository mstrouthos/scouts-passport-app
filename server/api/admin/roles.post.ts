import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, scopedScouts } from '../../utils/guard'
import { now } from '../../utils/passcode'

const MAX_PATROL_LEADERS = 2

/** Troop Leader: appoint/demote section-level Βαθμοφόροι (or, less commonly, a
    troop-wide or patrol-level grant) anywhere. Section leader: appoint/demote
    ONLY patrol-level leaders (e.g. Αρχηγός/Υπαρχηγός Ενωμοτίας), only within a
    patrol of their own section, capped at two per team. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ scoutId?: number, role?: string, scope?: string, sectionId?: number, patrolId?: number, rank?: string }>(event)
  const scoutId = Number(b?.scoutId)
  const db = useDb()
  const target = db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Not found' })
  if (target.id === me.id) throw createError({ statusCode: 400, message: 'You cannot change your own role' })

  const wantsScout = b?.role === 'scout'
  const rank = b?.rank === 'yparchigos' ? 'yparchigos' : 'archigos'

  if (me.role === 'troop_leader') {
    const role = ['scout', 'leader', 'troop_leader'].includes(b?.role as any) ? b!.role as any : target.role
    db.update(s.scouts).set({ role }).where(eq(s.scouts.id, scoutId)).run()
    db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId)).run()
    if (role === 'leader') {
      const scope = b?.scope === 'troop' ? 'troop' : b?.scope === 'patrol' ? 'patrol' : 'section'
      if (scope === 'patrol') {
        const patrolId = Number(b?.patrolId)
        const patrol = db.select().from(s.patrols).all().find(p => p.id === patrolId)
        if (!patrol) throw createError({ statusCode: 400, message: 'Bad team' })
        const already = db.select().from(s.leaderScopes).all()
          .filter(x => x.scope === 'patrol' && x.patrolId === patrolId).length
        if (already >= MAX_PATROL_LEADERS)
          throw createError({ statusCode: 400, message: 'This team already has two leaders' })
        db.insert(s.leaderScopes).values({ scoutId, scope: 'patrol', patrolId, rank, assignedBy: me.id, assignedAt: now() }).run()
      } else {
        const sectionId = scope === 'section' ? Number(b?.sectionId) : null
        if (scope === 'section' && !db.select().from(s.sections).all().some(x => x.id === sectionId))
          throw createError({ statusCode: 400, message: 'Bad section' })
        db.insert(s.leaderScopes).values({ scoutId, scope, sectionId, rank, assignedBy: me.id, assignedAt: now() }).run()
      }
    }
    return { ok: true }
  }

  // ----- section-scope leader: patrol-level leaders only, within their own section -----
  const secIds = scopedSectionIds(me)
  if (!secIds.length) throw createError({ statusCode: 403, message: 'Section leaders only' })
  const myPatrols = db.select().from(s.patrols).all().filter(p => secIds.includes(p.sectionId))

  if (wantsScout) {
    // demote: target must currently be a patrol leader within one of my patrols
    const existing = db.select().from(s.leaderScopes).all()
      .filter(x => x.scoutId === scoutId && x.scope === 'patrol' && myPatrols.some(p => p.id === x.patrolId))
    if (!existing.length) throw createError({ statusCode: 403, message: 'Out of your sector' })
    db.update(s.scouts).set({ role: 'scout' }).where(eq(s.scouts.id, scoutId)).run()
    db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId)).run()
    return { ok: true }
  }

  const patrolId = Number(b?.patrolId)
  const patrol = myPatrols.find(p => p.id === patrolId)
  if (!patrol) throw createError({ statusCode: 403, message: 'Out of your sector' })

  const isReassign = target.role === 'leader' && db.select().from(s.leaderScopes).all()
    .some(x => x.scoutId === scoutId && x.scope === 'patrol' && myPatrols.some(p => p.id === x.patrolId))
  if (!isReassign) {
    // fresh appointment: target must be a scout member of my section
    if (target.role !== 'scout' || !scopedScouts(me).some(r => r.id === scoutId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
  }
  const already = db.select().from(s.leaderScopes).all()
    .filter(x => x.scope === 'patrol' && x.patrolId === patrolId && x.scoutId !== scoutId).length
  if (already >= MAX_PATROL_LEADERS)
    throw createError({ statusCode: 400, message: 'This team already has two leaders' })

  db.update(s.scouts).set({ role: 'leader' }).where(eq(s.scouts.id, scoutId)).run()
  db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId)).run()
  db.insert(s.leaderScopes).values({ scoutId, scope: 'patrol', patrolId, rank, assignedBy: me.id, assignedAt: now() }).run()
  return { ok: true }
})
