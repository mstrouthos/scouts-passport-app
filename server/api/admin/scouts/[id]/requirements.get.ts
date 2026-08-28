import { requireLeader, idParam, rankOf } from '../../../../utils/guard'
import { passportFor, assertScoutVisible } from '../../../../utils/requirements'
import { isScoutTroop } from '../../../../utils/programme'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const kid = await assertScoutVisible(me, id)
  if (!(await isScoutTroop(id)))
    throw createError({ statusCode: 400, message: 'Οι Προσκοπικές Απαιτήσεις αφορούν μόνο την Ομάδα Προσκόπων' })
  const rank = await rankOf(me)
  return {
    scout: { id: kid.id, firstName: kid.firstName, lastName: kid.lastName },
    ...(await passportFor(id)),
    canAward: rank !== 'yparchigos'
  }
})
