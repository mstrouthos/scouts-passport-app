import { requireLeader, scopedSectionIds } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'
import { getPointRules, setPointRules, clearPointRules, setTeamScoring } from '../../../utils/settings'

/** Set the scoring rules — a section's own, by an Αρχηγός of that section (or an
    administrator), or the troop's default, by an administrator only.
    `reset: true` returns a section to the troop's rules. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<any>(event)
  const sectionId = b?.sectionId == null ? null : Number(b.sectionId)
  if (sectionId === null) {
    if (me.role !== 'troop_leader')
      throw createError({ statusCode: 403, message: 'Τις τιμές όλου του Συστήματος τις ορίζουν οι διαχειριστές' })
  } else {
    await assertCan(me, 'settings.edit')
    const secIds = await scopedSectionIds(me)
    if (!Number.isInteger(sectionId) || (secIds !== null && !secIds.includes(sectionId)))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
    if (b?.teamScoring === 'sum' || b?.teamScoring === 'average') await setTeamScoring(sectionId, b.teamScoring)
    if (b?.reset) { await clearPointRules(sectionId); return getPointRules(sectionId) }
  }
  await setPointRules({
    present: b?.present, excused: b?.excused,
    absent: b?.absent, uniformFull: b?.uniformFull,
    uniformPartial: b?.uniformPartial, uniformNone: b?.uniformNone
  }, sectionId)
  return getPointRules(sectionId)
})
