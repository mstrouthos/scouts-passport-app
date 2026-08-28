import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { pagesForSection } from '../../utils/infoScope'

/** The useful pages a family can read: whatever is written for the whole troop,
    plus whatever is written for each sector their children are in. A parent
    with children in two sectors gets both, each labelled, because the uniform
    and much else differs between them. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = await useDb()
  const all = (await db.select().from(s.infoPages)).filter(x => x.isPublished)
  const sections = await db.select().from(s.sections)

  const seen = new Set<string>()
  const out: any[] = []
  for (const sectionId of p.sectionIds) {
    const sec = sections.find(x => x.id === sectionId)
    for (const page of pagesForSection(all, sectionId)) {
      // the same troop-wide page must not repeat once per child
      const key = `${page.slug}:${page.sectionId ?? 0}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        slug: page.slug, icon: page.iconEmoji,
        titleEl: page.titleEl, titleEn: page.titleEn,
        summaryEl: page.summaryEl, summaryEn: page.summaryEn,
        sectionId: page.sectionId,
        // only worth naming the sector when the reader has more than one
        sectionEl: page.sectionId != null && p.sectionIds.length > 1 ? sec?.nameEl ?? null : null
      })
    }
  }
  return out
})
