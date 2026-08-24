import { requireScout } from '../utils/guard'
import { ventureFor, isVenture } from '../utils/venture'

/** An Ανιχνευτής's own booklet. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (!(await isVenture(me.id)))
    throw createError({ statusCode: 404, message: 'Not found' })
  return { ...(await ventureFor(me.id)), canSign: false }
})
