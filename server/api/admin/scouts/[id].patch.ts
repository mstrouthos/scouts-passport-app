import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, assertScoutInScope, assertLeaderInScope, scopedPatrolIds, idParam } from '../../../utils/guard'
import { normalizePhone } from '../../../utils/phone'
import { assertCan } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const id = idParam(event)
  const db = (await useDb())
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
  if (!target) throw createError({ statusCode: 404, message: 'Not found' })
  if (id !== me.id) {
    if (target.role === 'scout') await assertScoutInScope(me, id)
    else await assertLeaderInScope(me, id)
  }
  const body = await readBody<{
    patrolId?: number | null, isActive?: boolean, firstName?: string, lastName?: string,
    firstNameEn?: string, lastNameEn?: string, phone?: string, idNumber?: string
  }>(event)
  const set: any = {}
  if (typeof body?.isActive === 'boolean') set.isActive = body.isActive
  if (body?.firstName) set.firstName = String(body.firstName).trim()
  if (body?.lastName) set.lastName = String(body.lastName).trim()
  if (body?.firstNameEn !== undefined) set.firstNameEn = String(body.firstNameEn).trim() || null
  if (body?.lastNameEn !== undefined) set.lastNameEn = String(body.lastNameEn).trim() || null
  if (body?.phone !== undefined) set.phone = normalizePhone(body.phone)
  if (body?.idNumber !== undefined) set.idNumber = String(body.idNumber).trim() || null
  if (body?.email !== undefined) {
    const v = String(body.email || '').trim() || null
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw createError({ statusCode: 400, message: 'Bad email' })
    set.email = v
  }
  if (body?.birthday !== undefined) {
    const v = String(body.birthday || '').slice(0, 10) || null
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw createError({ statusCode: 400, message: 'Bad date' })
    set.birthday = v
  }
  // A member can be enrolled with no ενωμοτία / εξάδα / όμιλος and given one
  // later — or taken back out of one. `null` clears it; the unit must belong
  // to the member's own sector.
  if (body?.patrolId !== undefined) {
    if (body.patrolId === null || body.patrolId === 0 || body.patrolId === '') {
      if (target.sectionId == null) {
        const cur = target.patrolId != null
          ? (await db.select().from(s.patrols).where(eq(s.patrols.id, target.patrolId)).limit(1))[0]
          : null
        if (cur) set.sectionId = cur.sectionId   // keep the member in their sector
      }
      set.patrolId = null
    } else {
      const pid = Number(body.patrolId)
      const pids = await scopedPatrolIds(me)
      if (pids !== null && !pids.includes(pid))
        throw createError({ statusCode: 403, message: 'Target patrol out of your sector' })
      const patrol = (await db.select().from(s.patrols).where(eq(s.patrols.id, pid)).limit(1))[0]
      if (!patrol) throw createError({ statusCode: 400, message: 'Bad unit' })
      const mySection = target.sectionId ?? (target.patrolId != null
        ? (await db.select().from(s.patrols).where(eq(s.patrols.id, target.patrolId)).limit(1))[0]?.sectionId ?? null
        : null)
      if (mySection != null && patrol.sectionId !== mySection)
        throw createError({ statusCode: 400, message: 'That unit belongs to another sector' })
      set.patrolId = pid
    }
    // the unit head title belongs to the unit they left
    if (set.patrolId !== target.patrolId) set.patrolRole = null
  }
  if (Object.keys(set).length) await db.update(s.scouts).set(set).where(eq(s.scouts.id, id))
  return { ok: true }
})
