import { useDb, schema as s } from '../../db'
import { requireLeader, visibleSectionIds, sectionOfWith } from '../../utils/guard'
import { sectionsOfParent, childIdsOfParent } from '../../utils/parents'
import { assertCan } from '../../utils/permissions'

/** Parents in the sections this leader can see, each shown with their child. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const db = (await useDb())
  const visIds = await visibleSectionIds(me)
  const sections = (await db.select().from(s.sections)).sort((a, b) => a.sortOrder - b.sortOrder)
  const scouts = await db.select().from(s.scouts)
  const patrols = await db.select().from(s.patrols)
  const links = await db.select().from(s.parentChildren)
  const kidOf = new Map(scouts.map(x => [x.id, x]))

  // A family with children in two sectors belongs to both, and shows to the
  // Βαθμοφόροι of each — otherwise adding a second, younger child looks for
  // all the world like the parent failed to save.
  const rows = (await db.select().from(s.parents))
    .map(p => ({ p, sectionIds: sectionsOfParent(p, links, scouts, patrols) }))
    .filter(r => r.sectionIds.length && (visIds === null || r.sectionIds.some(id => visIds.includes(id))))
    .sort((a, b) => a.p.name.localeCompare(b.p.name, 'el'))

  return {
    sections: sections
      .filter(x => visIds === null || visIds.includes(x.id))
      .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug })),
    parents: rows.map(({ p, sectionIds }) => {
      const kids = childIdsOfParent(p, links).map(id => kidOf.get(id)).filter(Boolean) as any[]
      return {
        id: p.id, sectionId: sectionIds[0] ?? null, sectionIds,
        name: p.name, email: p.email, phone: p.phone,
        isActive: p.isActive, hasCode: !!p.passcodeHmac,
        scoutId: p.scoutId,
        // each child with their sector, so a row under the Αγέλη names only the
        // λυκόπουλο, not the sibling in the Ομάδα
        children: kids.map(k => ({
          id: k.id, name: `${k.firstName} ${k.lastName}`, sectionId: sectionOfWith(k, patrols)
        })),
        scoutName: kids.map(k => `${k.firstName} ${k.lastName}`).join(', ') || null
      }
    })
  }
})
