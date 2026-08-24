import { requireLeader, idParam, rankOf } from '../../../../utils/guard'
import { assertScoutVisible } from '../../../../utils/requirements'
import { ventureFor, isVenture } from '../../../../utils/venture'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const kid = await assertScoutVisible(me, id)
  if (!(await isVenture(id)))
    throw createError({ statusCode: 400, message: 'Το Η.Κ.Α.Δ.Ε. αφορά μόνο την Κοινότητα Ανιχνευτών' })
  return {
    scout: { id: kid.id, firstName: kid.firstName, lastName: kid.lastName },
    ...(await ventureFor(id)),
    canSign: (await rankOf(me)) !== 'yparchigos'
  }
})
