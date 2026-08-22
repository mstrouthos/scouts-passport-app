import { requireLeader } from '../../../utils/guard'
import { challengeInScope } from '../../../utils/challengeScope'
import { deleteChallenges } from '../../../utils/challengeDelete'

/** Delete several questions at once. Every id is scope-checked first, so a
    single out-of-sector id fails the whole request rather than partially
    deleting — safer than silently skipping when the user picked deliberately.
    Answers and any other related rows go too; see utils/challengeDelete. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ ids?: number[] }>(event)
  const ids = Array.isArray(b?.ids) ? b!.ids!.map(Number).filter(Number.isInteger) : []
  if (!ids.length) throw createError({ statusCode: 400, message: 'No questions selected' })
  if (ids.length > 200) throw createError({ statusCode: 400, message: 'Too many at once (max 200)' })

  for (const id of ids) await challengeInScope(me, id)
  await deleteChallenges(ids)
  return { deleted: ids.length }
})
