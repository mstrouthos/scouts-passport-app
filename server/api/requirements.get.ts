import { requireScout } from '../utils/guard'
import { passportFor } from '../utils/requirements'
import { isScoutTroop } from '../utils/programme'

/** A scout's own passport progress. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (!(await isScoutTroop(me.id)))
    throw createError({ statusCode: 404, message: 'Not found' })
  return { ...(await passportFor(me.id)), canAward: false }
})
