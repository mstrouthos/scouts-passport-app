import { useDb, schema as s } from '../../db'
import { requireLeader, visibleSectionIds } from '../../utils/guard'

/** Parents in the sections this leader can see, one entry per person. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const visIds = await visibleSectionIds(me)
  const sections = (await db.select().from(s.sections)).sort((a, b) => a.sortOrder - b.sortOrder)
  const rows = (await db.select().from(s.parents))
    .filter(p => visIds === null || visIds.includes(p.sectionId))
    .sort((a, b) => a.name.localeCompare(b.name, 'el'))
  return {
    sections: sections
      .filter(x => visIds === null || visIds.includes(x.id))
      .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug })),
    parents: rows.map(p => ({
      id: p.id, sectionId: p.sectionId, name: p.name, email: p.email, phone: p.phone,
      isActive: p.isActive, hasCode: !!p.passcodeHmac
    }))
  }
})
