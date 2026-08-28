import { useDb, schema as s } from '../../../db'
import { requireParent } from '../../../utils/parentGuard'
import { pagesForSection } from '../../../utils/infoScope'

/** One page, resolved against the reader's own sectors — a slug alone is no
    longer unique now that a sector can override a troop-wide page. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const slug = getRouterParam(event, 'slug') || ''
  const sectionId = Number(getQuery(event).section)
  const db = await useDb()
  const all = (await db.select().from(s.infoPages)).filter(x => x.isPublished)

  // prefer the sector asked for, when it is one of theirs
  const order = Number.isInteger(sectionId) && p.sectionIds.includes(sectionId)
    ? [sectionId, ...p.sectionIds.filter(x => x !== sectionId)]
    : p.sectionIds
  for (const sec of order) {
    const page = pagesForSection(all, sec).find(x => x.slug === slug)
    if (page) return {
      slug: page.slug, icon: page.iconEmoji, titleEl: page.titleEl, titleEn: page.titleEn,
      bodyEl: page.bodyEl, bodyEn: page.bodyEn, illustration: page.illustration
    }
  }
  throw createError({ statusCode: 404, message: 'Not found' })
})
