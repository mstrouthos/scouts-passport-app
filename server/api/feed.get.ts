import { requireScout } from '../utils/guard'
import { feedFor } from '../utils/patrolFeed'

/** The member's Ενωμοτία's recent wins, with their 👏. */
export default defineEventHandler(async (event) => feedFor(await requireScout(event)))
