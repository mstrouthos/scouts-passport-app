import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, scopedScouts, assertLeaderInScope } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { assertCan } from '../../utils/permissions'
import { cascadeDeleteScout } from '../../utils/deleteScout'


/** Appoint and demote Βαθμοφόροι. A Βαθμοφόρος is scoped to a sector or to the
    whole troop, and only the Αρχηγός Συστήματος assigns either — a unit's head
    (Ενωμοτάρχης, Ομιλάρχης, Εξαδάρχης) is a member of the unit, appointed
    separately, and is not a Βαθμοφόρος at all. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
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

    // Βαθμοφόροι are scoped to a sector or to the whole troop — only the
    // Αρχηγός Συστήματος hands either out
    if (me.role !== 'troop_leader')
      throw createError({ statusCode: 403, message: 'Only the Αρχηγός Συστήματος can assign a sector' })
    const scope = b.scope === 'troop' ? 'troop' : 'section'
    const sectionId = scope === 'section' ? Number(b.sectionId) : null
    if (scope === 'section' && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
      throw createError({ statusCode: 400, message: 'Bad section' })
    await db.insert(s.leaderScopes).values({ scoutId, scope, sectionId, rank, assignedBy: me.id, assignedAt: now() })
    if (target.role === 'scout') await db.update(s.scouts).set({ role: 'leader' }).where(eq(s.scouts.id, scoutId))
    return { ok: true }
  }

  if (b?.action === 'removeScope') {
    const scopeId = Number(b.scopeId)
    const row = (await db.select().from(s.leaderScopes).where(eq(s.leaderScopes.id, scopeId)).limit(1))[0]
    if (!row) throw createError({ statusCode: 404, message: 'Not found' })
    if (row.scoutId === me.id) throw createError({ statusCode: 400, message: 'You cannot change your own role' })
    if (me.role !== 'troop_leader')
      throw createError({ statusCode: 403, message: 'Only the Αρχηγός Συστήματος can remove a sector' })
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
      const scope = b?.scope === 'troop' ? 'troop' : 'section'
      const sectionId = scope === 'section' ? Number(b?.sectionId) : null
      if (scope === 'section' && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
        throw createError({ statusCode: 400, message: 'Bad section' })
      await db.insert(s.leaderScopes).values({ scoutId, scope, sectionId, rank, assignedBy: me.id, assignedAt: now() })
    }
    return { ok: true }
  }

  // Appointing Βαθμοφόροι is the Αρχηγός Συστήματος's alone. A sector's Αρχηγός
  // names the head of a unit instead, which is a different thing entirely — a
  // member of the unit holding a title, handled by scouts/[id]/unit-role.
  throw createError({ statusCode: 403, message: 'Only the Αρχηγός Συστήματος can appoint Βαθμοφόρους' })
})
