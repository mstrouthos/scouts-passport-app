import { inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { challengeInScope } from '../../../utils/challengeScope'

/** Delete several questions at once. Every id is scope-checked first, so a
    single out-of-sector id fails the whole request rather than partially
    deleting — safer than silently skipping when the user picked deliberately. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ ids?: number[] }>(event)
  const ids = Array.isArray(b?.ids) ? b!.ids!.map(Number).filter(Number.isInteger) : []
  if (!ids.length) throw createError({ statusCode: 400, message: 'No questions selected' })
  if (ids.length > 200) throw createError({ statusCode: 400, message: 'Too many at once (max 200)' })

  for (const id of ids) await challengeInScope(me, id)

  const db = (await useDb())
  await db.delete(s.challengeAnswers).where(inArray(s.challengeAnswers.challengeId, ids))
  await db.delete(s.challengeOptions).where(inArray(s.challengeOptions.challengeId, ids))
  await db.delete(s.challenges).where(inArray(s.challenges.id, ids))
  return { deleted: ids.length }
})
