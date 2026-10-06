import { requireScout } from '../../utils/guard'
import { syncRewards } from '../../utils/rewards'

/** The member's limited-edition collection: what they have earned, and their
    streak now and at its best, for the progress towards the next. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const r = await syncRewards(me.id)
  return { current: r.current, best: r.best, unlocked: r.unlocked }
})
