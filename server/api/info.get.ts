import { schema as s } from '../db'
import { requireScout, sectionOfWith } from '../utils/guard'
import { useDb } from '../db'
import { pagesForSection, allInfoPages } from '../utils/infoScope'

/** The info pages for the reader's own sector, plus the troop-wide ones. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = await useDb()
  const mySection = sectionOfWith(me, await db.select().from(s.patrols))
  const rows = pagesForSection(await allInfoPages(), mySection)
    .filter(p => p.isPublished || me.role !== 'scout')
  return rows.map(p => ({
    slug: p.slug, icon: p.iconEmoji, titleEl: p.titleEl, titleEn: p.titleEn,
    summaryEl: p.summaryEl, summaryEn: p.summaryEn, isPublished: p.isPublished,
    sectionId: p.sectionId
  }))
})
