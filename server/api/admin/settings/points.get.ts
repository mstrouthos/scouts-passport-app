import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds } from '../../../utils/guard'
import { can } from '../../../utils/permissions'
import { getPointRules, hasOwnPointRules, getTeamScoring } from '../../../utils/settings'

/** The scoring rules: the troop's, and each section's this leader looks after —
    its own where it has set them, else the troop's. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const secIds = await scopedSectionIds(me)
  const mayEdit = await can(me, 'settings.edit')
  const sections = (await db.select().from(s.sections)).sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(x => secIds === null || secIds.includes(x.id))
  return {
    troop: await getPointRules(null),
    canEditTroop: me.role === 'troop_leader',
    sections: await Promise.all(sections.map(async x => ({
      id: x.id, nameEl: x.nameEl, nameEn: x.nameEn,
      rules: await getPointRules(x.id),
      own: await hasOwnPointRules(x.id),
      teamScoring: await getTeamScoring(x.id),
      canEdit: mayEdit
    })))
  }
})
