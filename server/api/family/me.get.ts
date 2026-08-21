import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'

export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const sec = (await (await useDb()).select().from(s.sections)).find(x => x.id === p.sectionId)
  return {
    name: p.name,
    section: sec ? { id: sec.id, nameEl: sec.nameEl, nameEn: sec.nameEn, slug: sec.slug } : null
  }
})
