import { schema as s, useDb } from '../../db'
import { requireScout, sectionOfWith } from '../../utils/guard'
import { pagesForSection, allInfoPages } from '../../utils/infoScope'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const slug = getRouterParam(event, 'slug') || ''
  const db = await useDb()
  const mySection = sectionOfWith(me, await db.select().from(s.patrols))
  const p = pagesForSection(await allInfoPages(), mySection).find(x => x.slug === slug)
  if (!p || (!p.isPublished && me.role === 'scout'))
    throw createError({ statusCode: 404, message: 'Not found' })
  return {
    slug: p.slug, icon: p.iconEmoji, titleEl: p.titleEl, titleEn: p.titleEn,
    summaryEl: p.summaryEl, summaryEn: p.summaryEn,
    bodyEl: p.bodyEl, bodyEn: p.bodyEn, illustration: p.illustration,
    sectionId: p.sectionId
  }
})
