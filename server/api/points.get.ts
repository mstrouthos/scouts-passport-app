import { requireScout } from '../utils/guard'
import { pointsBreakdown } from '../utils/pointsBreakdown'

/** Where the signed-in member's points came from (see utils/pointsBreakdown). */
export default defineEventHandler(async (event) => pointsBreakdown(await requireScout(event)))
