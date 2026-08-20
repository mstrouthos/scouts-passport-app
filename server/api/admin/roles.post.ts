import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, scopedScouts, assertLeaderInScope } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { cascadeDeleteScout } from '../../utils/deleteScout'

const MAX_PATROL_LEADERS = 2

/** Troop Leader: appoint/demote section-level Βαθμοφόροι (or, less commonly, a
    troop-wide or patrol-level grant) anywhere. Section leader: appoint/demote
    ONLY patrol-level leaders (e.g. Αρχηγός/Υπαρχηγός Ενωμοτίας), only within a
    patrol of their own section, capped at two per team. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{
    action?: string, scoutId?: number, scopeId?: number, admin?: boolean,
    role?: string, scope?: string, sectionId?: number, patrolId?: number, rank?: string
  }>(event)
  const db = (await useDb())

  // ----- grant/revoke Αρχηγός Συστήματος (full access, every sector) -----
  // Only an existing Αρχηγός Συστήματος may hand this out.
  if (b?.action === 'setAdmin') {
    if (me.role !== 'troop_leader')
      throw createError({ statusCode: 403, message: 'Only the Αρχηγός Συστήματος can grant full access' })
    const scoutId = Number(b.scoutId)
    if (scoutId === me.id) throw createError({ statusCode: 400, message: 'You cannot change your own role' })
    const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).limit(1))[0]
    if (!target) throw createError({ statusCode: 404, message: 'Not found' })

    if (b.admin === true) {
      // Keep their existing scopes: a troop leader ignores them, but they are
      // restored intact if full access is later revoked.
      await db.update(s.scouts).set({ role: 'troop_leader' }).where(eq(s.scouts.id, scoutId))
    } else {
      const remaining = (await db.select().from(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId)))
      await db.update(s.scouts).set({ role: remaining.length ? 'leader' : 'scout' }).where(eq(s.scouts.id, scoutId))
    }
    return { ok: true }
  }

  // ----- multi-role: add one more scope without touching existing ones -----
  if (b?.action === 'addScope') {
    const scoutId = Number(b.scoutId)
    const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).limit(1))[0]
    if (!target) throw createError({ statusCode: 404, message: 'Not found' })
    if (target.id === me.id) throw createError({ statusCode: 400, message: 'You cannot change your own role' })
    const rank = b.rank === 'yparchigos' ? 'yparchigos' : 'archigos'

    if (me.role === 'troop_leader') {
      const scope = b.scope === 'patrol' ? 'patrol' : b.scope === 'troop' ? 'troop' : 'section'
      if (scope === 'patrol') {
        const patrolId = Number(b.patrolId)
        if (!(await db.select().from(s.patrols)).some(p => p.id === patrolId))
          throw createError({ statusCode: 400, message: 'Bad team' })
        const already = (await db.select().from(s.leaderScopes)).filter(x => x.scope === 'patrol' && x.patrolId === patrolId).length
        if (already >= MAX_PATROL_LEADERS) throw createError({ statusCode: 400, message: 'This team already has two leaders' })
        await db.insert(s.leaderScopes).values({ scoutId, scope: 'patrol', patrolId, rank, assignedBy: me.id, assignedAt: now() })
      } else {
        const sectionId = scope === 'section' ? Number(b.sectionId) : null
        if (scope === 'section' && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
          throw createError({ statusCode: 400, message: 'Bad section' })
        await db.insert(s.leaderScopes).values({ scoutId, scope, sectionId, rank, assignedBy: me.id, assignedAt: now() })
      }
    } else {
      const secIds = await scopedSectionIds(me)
      if (!secIds.length) throw createError({ statusCode: 403, message: 'Section leaders only' })
      const myPatrols = (await db.select().from(s.patrols)).filter(p => secIds.includes(p.sectionId))
      const patrolId = Number(b.patrolId)
      const patrol = myPatrols.find(p => p.id === patrolId)
      if (!patrol) throw createError({ statusCode: 403, message: 'Out of your sector' })
      if (target.role !== 'scout' && target.role !== 'leader') throw createError({ statusCode: 403, message: 'Out of your sector' })
      const already = (await db.select().from(s.leaderScopes)).filter(x => x.scope === 'patrol' && x.patrolId === patrolId).length
      if (already >= MAX_PATROL_LEADERS) throw createError({ statusCode: 400, message: 'This team already has two leaders' })
      await db.insert(s.leaderScopes).values({ scoutId, scope: 'patrol', patrolId, rank, assignedBy: me.id, assignedAt: now() })
    }
    if (target.role === 'scout') await db.update(s.scouts).set({ role: 'leader' }).where(eq(s.scouts.id, scoutId))
    return { ok: true }
  }

  if (b?.action === 'removeScope') {
    const scopeId = Number(b.scopeId)
    const row = (await db.select().from(s.leaderScopes).where(eq(s.leaderScopes.id, scopeId)).limit(1))[0]
    if (!row) throw createError({ statusCode: 404, message: 'Not found' })
    if (row.scoutId === me.id) throw createError({ statusCode: 400, message: 'You cannot change your own role' })
    if (me.role !== 'troop_leader') {
      const secIds = await scopedSectionIds(me)
      const myPatrols = (await db.select().from(s.patrols)).filter(p => secIds.includes(p.sectionId)).map(p => p.id)
      if (row.scope !== 'patrol' || row.patrolId == null || !myPatrols.includes(row.patrolId))
        throw createError({ statusCode: 403, message: 'Out of your sector' })
    }
    await db.delete(s.leaderScopes).where(eq(s.leaderScopes.id, scopeId))
    const remaining = (await db.select().from(s.leaderScopes).where(eq(s.leaderScopes.scoutId, row.scoutId)))
    if (!remaining.length) await db.update(s.scouts).set({ role: 'scout' }).where(eq(s.scouts.id, row.scoutId))
    return { ok: true }
  }

  if (b?.action === 'delete') {
    const scoutId = Number(b.scoutId)
    if (scoutId === me.id) throw createError({ statusCode: 400, message: 'You cannot delete yourself' })
    if (me.role !== 'troop_leader') await assertLeaderInScope(me, scoutId)
    try { await cascadeDeleteScout(scoutId) }
    catch { throw createError({ statusCode: 400, message: 'This record still has linked history and cannot be deleted' }) }
    return { ok: true }
  }

  // ----- legacy: wipe-and-replace the single scope (still used by the main
  // "assign scope" sheet and the section-leader patrol-appoint flow) -----
  const scoutId = Number(b?.scoutId)
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).limit(1))[0]
  if (!target) throw createError({ statusCode: 404, message: 'Not found' })
  if (target.id === me.id) throw createError({ statusCode: 400, message: 'You cannot change your own role' })

  const wantsScout = b?.role === 'scout'
  const rank = b?.rank === 'yparchigos' ? 'yparchigos' : 'archigos'

  if (me.role === 'troop_leader') {
    const role = ['scout', 'leader', 'troop_leader'].includes(b?.role as any) ? b!.role as any : target.role
    await db.update(s.scouts).set({ role }).where(eq(s.scouts.id, scoutId))
    await db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId))
    if (role === 'leader') {
      const scope = b?.scope === 'troop' ? 'troop' : b?.scope === 'patrol' ? 'patrol' : 'section'
      if (scope === 'patrol') {
        const patrolId = Number(b?.patrolId)
        const patrol = (await db.select().from(s.patrols)).find(p => p.id === patrolId)
        if (!patrol) throw createError({ statusCode: 400, message: 'Bad team' })
        const already = (await db.select().from(s.leaderScopes))
          .filter(x => x.scope === 'patrol' && x.patrolId === patrolId).length
        if (already >= MAX_PATROL_LEADERS)
          throw createError({ statusCode: 400, message: 'This team already has two leaders' })
        await db.insert(s.leaderScopes).values({ scoutId, scope: 'patrol', patrolId, rank, assignedBy: me.id, assignedAt: now() })
      } else {
        const sectionId = scope === 'section' ? Number(b?.sectionId) : null
        if (scope === 'section' && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
          throw createError({ statusCode: 400, message: 'Bad section' })
        await db.insert(s.leaderScopes).values({ scoutId, scope, sectionId, rank, assignedBy: me.id, assignedAt: now() })
      }
    }
    return { ok: true }
  }

  // ----- section-scope leader: patrol-level leaders only, within their own section -----
  const secIds = await scopedSectionIds(me)
  if (!secIds.length) throw createError({ statusCode: 403, message: 'Section leaders only' })
  const myPatrols = (await db.select().from(s.patrols)).filter(p => secIds.includes(p.sectionId))

  if (wantsScout) {
    // demote: target must currently be a patrol leader within one of my patrols
    const existing = (await db.select().from(s.leaderScopes))
      .filter(x => x.scoutId === scoutId && x.scope === 'patrol' && myPatrols.some(p => p.id === x.patrolId))
    if (!existing.length) throw createError({ statusCode: 403, message: 'Out of your sector' })
    await db.update(s.scouts).set({ role: 'scout' }).where(eq(s.scouts.id, scoutId))
    await db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId))
    return { ok: true }
  }

  const patrolId = Number(b?.patrolId)
  const patrol = myPatrols.find(p => p.id === patrolId)
  if (!patrol) throw createError({ statusCode: 403, message: 'Out of your sector' })

  const isReassign = target.role === 'leader' && (await db.select().from(s.leaderScopes))
    .some(x => x.scoutId === scoutId && x.scope === 'patrol' && myPatrols.some(p => p.id === x.patrolId))
  if (!isReassign) {
    // fresh appointment: target must be a scout member of my section
    if (target.role !== 'scout' || !(await scopedScouts(me)).some(r => r.id === scoutId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
  }
  const already = (await db.select().from(s.leaderScopes))
    .filter(x => x.scope === 'patrol' && x.patrolId === patrolId && x.scoutId !== scoutId).length
  if (already >= MAX_PATROL_LEADERS)
    throw createError({ statusCode: 400, message: 'This team already has two leaders' })

  await db.update(s.scouts).set({ role: 'leader' }).where(eq(s.scouts.id, scoutId))
  await db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId))
  await db.insert(s.leaderScopes).values({ scoutId, scope: 'patrol', patrolId, rank, assignedBy: me.id, assignedAt: now() })
  return { ok: true }
})
