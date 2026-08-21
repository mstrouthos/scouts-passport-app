import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'

/** Announcements for this parent's section (plus troop-wide ones). */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = (await useDb())
  const files = new Map((await db.select().from(s.files)).map(f => [f.id, f]))
  return (await db.select().from(s.parentPosts))
    .filter(x => x.isPublished && (x.sectionId == null || x.sectionId === p.sectionId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(x => {
      const f = x.fileId != null ? files.get(x.fileId) : null
      return {
        id: x.id, titleEl: x.titleEl, bodyEl: x.bodyEl, createdAt: x.createdAt,
        file: f ? { id: f.id, name: f.name, size: f.size } : null
      }
    })
})
