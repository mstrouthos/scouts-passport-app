import { requireTroopLeader } from '../../../utils/guard'
import { getPointRules, setPointRules } from '../../../utils/settings'

/** Troop-wide scoring rules — the Αρχηγός Συστήματος sets these for everyone. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const b = await readBody<any>(event)
  await setPointRules({
    present: b?.present, excused: b?.excused,
    absent: b?.absent, uniformFull: b?.uniformFull
  })
  return getPointRules()
})
