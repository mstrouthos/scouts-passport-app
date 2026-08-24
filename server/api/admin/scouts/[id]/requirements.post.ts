import { requireLeader, idParam } from '../../../../utils/guard'
import { assertCanAward, assertScoutVisible, awardRequirement, revokeRequirement } from '../../../../utils/requirements'
import { notifyAward } from '../../../../utils/celebrate'
import { useDb, schema as s } from '../../../../db'
import { eq } from 'drizzle-orm'

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
  const req = (await (await useDb()).select().from(s.scoutRequirements)
    .where(eq(s.scoutRequirements.id, requirementId)).limit(1))[0]
  if (req) await notifyAward(id, 'requirement', requirementId, req.themeEl || `#${req.n}`)
  return { ok: true, done: true, completedOn: on }
})
