import { requireScout } from '../../utils/guard'
import { momentsFor } from '../../utils/moments'

/** What has happened for the member since the app last showed them. */
export default defineEventHandler(async (event) => momentsFor(await requireScout(event)))
