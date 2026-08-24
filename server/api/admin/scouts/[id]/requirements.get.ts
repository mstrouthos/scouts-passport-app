import { requireLeader, idParam, rankOf } from '../../../../utils/guard'
import { passportFor, assertScoutVisible } from '../../../../utils/requirements'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const kid = await assertScoutVisible(me, id)
  const rank = await rankOf(me)
  return {
    scout: { id: kid.id, firstName: kid.firstName, lastName: kid.lastName },
    ...(await passportFor(id)),
    canAward: rank !== 'yparchigos'
  }
})
