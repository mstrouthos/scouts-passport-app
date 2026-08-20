import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

/** Patrols in sections this leader administers (section-wide power only —
    patrol-level leaders cannot create/rename/delete patrols). */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  return (await db.select().from(s.patrols))
    .filter(p => secIds === null || secIds.includes(p.sectionId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(p => ({ id: p.id, sectionId: p.sectionId, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem }))
})
