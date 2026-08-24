import { requireLeader, idParam } from '../../../utils/guard'
import { challengeInScope } from '../../../utils/challengeScope'
import { deleteChallenges } from '../../../utils/challengeDelete'
import { assertCan } from '../../../utils/permissions'

/** Remove a question, answers and all. See utils/challengeDelete. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'challenge.write')
  const id = idParam(event)
  await challengeInScope(me, id)
  await deleteChallenges([id])
  return { ok: true }
})
