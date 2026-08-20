import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, assertScoutInScope, scopedPatrolIds, idParam } from '../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  assertScoutInScope(me, id)
  const body = await readBody<{ patrolId?: number, isActive?: boolean, firstName?: string, lastName?: string }>(event)
  const set: any = {}
  if (typeof body?.isActive === 'boolean') set.isActive = body.isActive
  if (body?.firstName) set.firstName = String(body.firstName).trim()
  if (body?.lastName) set.lastName = String(body.lastName).trim()
  if (body?.patrolId != null) {
    const pids = scopedPatrolIds(me)
    if (pids !== null && !pids.includes(Number(body.patrolId)))
      throw createError({ statusCode: 403, message: 'Target patrol out of your sector' })
    set.patrolId = Number(body.patrolId)
  }
  if (Object.keys(set).length) useDb().update(s.scouts).set(set).where(eq(s.scouts.id, id)).run()
  return { ok: true }
})
