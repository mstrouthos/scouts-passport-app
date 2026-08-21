import { useDb, schema as s } from '../../db'
import { requireLeader, visibleSectionIds } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const visIds = await visibleSectionIds(me)
  const files = new Map((await db.select().from(s.files)).map(f => [f.id, f]))
  const sections = new Map((await db.select().from(s.sections)).map(x => [x.id, x]))
  return (await db.select().from(s.parentPosts))
    .filter(x => visIds === null || x.sectionId == null || visIds.includes(x.sectionId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(x => {
      const f = x.fileId != null ? files.get(x.fileId) : null
      const sec = x.sectionId != null ? sections.get(x.sectionId) : null
      return {
        id: x.id, sectionId: x.sectionId, sectionEl: sec?.nameEl ?? null,
        titleEl: x.titleEl, bodyEl: x.bodyEl, isPublished: x.isPublished, createdAt: x.createdAt,
        file: f ? { id: f.id, name: f.name, size: f.size } : null
      }
    })
})
