import { requireLeader, idParam } from '../../../../utils/guard'
import { assertScoutVisible } from '../../../../utils/requirements'
import { pointsBreakdown } from '../../../../utils/pointsBreakdown'

/** Where a member's points came from, for the Βαθμοφόροι of their sector —
    opened from the league table. The same list the member sees. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const kid = await assertScoutVisible(me, idParam(event))
  return { ...(await pointsBreakdown(kid)), scout: { id: kid.id, firstName: kid.firstName, lastName: kid.lastName, firstNameEn: kid.firstNameEn, lastNameEn: kid.lastNameEn } }
})
