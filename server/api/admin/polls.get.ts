import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'
import { pollsFor } from '../../utils/polls'

/** The polls put to this leader, and the sectors they may put one to. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const secIds = await scopedSectionIds(me)
  const rank = await rankOf(me)
  const sections = (await db.select().from(s.sections)).sort((a, b) => a.sortOrder - b.sortOrder)
  return {
    polls: await pollsFor(me),
    // a Υπαρχηγός answers polls but does not put them
    canCreate: rank !== 'yparchigos',
    canAskWholeTroop: me.role === 'troop_leader',
    sections: sections
      .filter(x => secIds === null || secIds.includes(x.id))
      .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug }))
  }
})
