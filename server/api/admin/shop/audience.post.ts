import { requireTroopLeader } from '../../../utils/guard'
import { setShopAudience } from '../../../utils/shop'

/** Who the shop is open to — the Βαθμοφόροι, the members of any κλάδος —
    set by the Αρχηγός Συστήματος. Whoever runs it always sees it. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const b = await readBody<{ leaders?: boolean, sections?: number[] }>(event)
  await setShopAudience({ leaders: b?.leaders !== false, sections: Array.isArray(b?.sections) ? b!.sections : [] })
  return { ok: true }
})
