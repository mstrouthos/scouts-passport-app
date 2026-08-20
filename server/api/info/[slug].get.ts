import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const slug = getRouterParam(event, 'slug') || ''
  const p = useDb().select().from(s.infoPages).where(eq(s.infoPages.slug, slug)).get()
  if (!p || (!p.isPublished && me.role === 'scout'))
    throw createError({ statusCode: 404, message: 'Not found' })
  return {
    slug: p.slug, icon: p.iconEmoji, titleEl: p.titleEl, titleEn: p.titleEn,
    summaryEl: p.summaryEl, summaryEn: p.summaryEn,
    bodyEl: p.bodyEl, bodyEn: p.bodyEn, illustration: p.illustration
  }
})
