import { requireScout } from '../utils/guard'
import { passportFor } from '../utils/requirements'

/** A scout's own passport progress. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  return { ...(await passportFor(me.id)), canAward: false }
})
