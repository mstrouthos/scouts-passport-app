import { requireScout } from '../../../utils/guard'
import { momentsSeen } from '../../../utils/moments'

/** The member has seen everything up to `at`. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  await momentsSeen(me, (await readBody<{ at?: string }>(event))?.at)
  return { ok: true }
})
