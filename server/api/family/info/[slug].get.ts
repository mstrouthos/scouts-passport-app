import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'

/** Public: one published info page for the parents' view. */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const p = (await (await useDb()).select().from(s.infoPages).where(eq(s.infoPages.slug, slug)).limit(1))[0]
  if (!p || !p.isPublished) throw createError({ statusCode: 404, message: 'Not found' })
  return {
    slug: p.slug, icon: p.iconEmoji, titleEl: p.titleEl, titleEn: p.titleEn,
    bodyEl: p.bodyEl, bodyEn: p.bodyEn, illustration: p.illustration
  }
})
