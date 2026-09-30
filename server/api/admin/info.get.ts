import { useDb, schema as s } from '../../db'
import { requireLeader, visibleSectionIds } from '../../utils/guard'
import { can } from '../../utils/permissions'

/** Every info page a leader may manage, sector pages and troop-wide alike —
    unlike the reader-facing list, which narrows to one sector. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const visIds = await visibleSectionIds(me)
  const sections = (await db.select().from(s.sections)).sort((a, b) => a.sortOrder - b.sortOrder)
  const rows = (await db.select().from(s.infoPages))
    .filter(p => p.sectionId == null || visIds === null || visIds.includes(p.sectionId))
    .sort((a, b) => (a.sectionId ?? 0) - (b.sectionId ?? 0) || a.sortOrder - b.sortOrder)
  const people = new Map((await db.select().from(s.scouts)).map(r => [r.id, `${r.firstName} ${r.lastName}`]))
  return {
    // every Βαθμοφόρος writes; administrators publish, and order the list
    // with the Αρχηγοί
    isAdmin: me.role === 'troop_leader',
    canReorder: await can(me, 'info.edit'),
    sections: sections
      .filter(x => visIds === null || visIds.includes(x.id))
      .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug })),
    pages: rows.map(p => ({
      id: p.id, slug: p.slug, icon: p.iconEmoji, titleEl: p.titleEl, titleEn: p.titleEn,
      summaryEl: p.summaryEl, summaryEn: p.summaryEn, bodyEl: p.bodyEl, bodyEn: p.bodyEn,
      sectionId: p.sectionId, isPublished: p.isPublished, sortOrder: p.sortOrder,
      pendingApproval: p.pendingApproval, illustration: p.illustration, author: p.createdBy ? people.get(p.createdBy) ?? null : null
    }))
  }
})
