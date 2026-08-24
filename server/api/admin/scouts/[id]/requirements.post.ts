import { requireLeader, idParam } from '../../../../utils/guard'
import { assertCanAward, assertScoutVisible, awardRequirement, revokeRequirement } from '../../../../utils/requirements'

/** Sign a requirement off, or take it back. Body: { requirementId, completedOn?, done } */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await assertScoutVisible(me, id)
  await assertCanAward(me)

  const b = await readBody<{ requirementId?: number, completedOn?: string, done?: boolean }>(event)
  const requirementId = Number(b?.requirementId)
  if (!Number.isInteger(requirementId))
    throw createError({ statusCode: 400, message: 'Bad requirement' })

  if (b?.done === false) {
    await revokeRequirement(id, requirementId)
    return { ok: true, done: false }
  }
  const on = String(b?.completedOn || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on))
    throw createError({ statusCode: 400, message: 'Bad date' })
  await awardRequirement(id, requirementId, me.id, on)
  return { ok: true, done: true, completedOn: on }
})
