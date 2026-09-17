import { requireBarStaff, couponBalances } from '../../utils/bar'

/** Every table's coupons: issued at the door, used at the bar, left. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  return couponBalances(me.eventId)
})
