import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, assertScoutInScope, assertLeaderInScope, scopedPatrolIds, idParam } from '../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const target = useDb().select().from(s.scouts).where(eq(s.scouts.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Not found' })
  if (target.role === 'scout') assertScoutInScope(me, id)
  else assertLeaderInScope(me, id)
  const body = await readBody<{
    patrolId?: number, isActive?: boolean, firstName?: string, lastName?: string,
    firstNameEn?: string, lastNameEn?: string, phone?: string, idNumber?: string
  }>(event)
  const set: any = {}
  if (typeof body?.isActive === 'boolean') set.isActive = body.isActive
  if (body?.firstName) set.firstName = String(body.firstName).trim()
  if (body?.lastName) set.lastName = String(body.lastName).trim()
  if (body?.firstNameEn !== undefined) set.firstNameEn = String(body.firstNameEn).trim() || null
  if (body?.lastNameEn !== undefined) set.lastNameEn = String(body.lastNameEn).trim() || null
  if (body?.phone !== undefined) set.phone = String(body.phone).trim() || null
  if (body?.idNumber !== undefined) set.idNumber = String(body.idNumber).trim() || null
  if (body?.patrolId != null) {
    const pids = scopedPatrolIds(me)
    if (pids !== null && !pids.includes(Number(body.patrolId)))
      throw createError({ statusCode: 403, message: 'Target patrol out of your sector' })
    set.patrolId = Number(body.patrolId)
  }
  if (Object.keys(set).length) useDb().update(s.scouts).set(set).where(eq(s.scouts.id, id)).run()
  return { ok: true }
})
