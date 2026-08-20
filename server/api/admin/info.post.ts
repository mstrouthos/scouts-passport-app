import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'

/** Create or update an info page (upsert by slug). */
export default defineEventHandler(async (event) => {
  await requireLeader(event)
  const b = await readBody<any>(event)
  const slug = String(b?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (!slug || !b?.titleEl) throw createError({ statusCode: 400, message: 'Slug and Greek title required' })
  const db = (await useDb())
  const set = {
    iconEmoji: b.iconEmoji || 'ℹ️',
    titleEl: String(b.titleEl), titleEn: b.titleEn || null,
    summaryEl: b.summaryEl || '', summaryEn: b.summaryEn || null,
    bodyEl: b.bodyEl || '', bodyEn: b.bodyEn || null,
    isPublished: !!b.isPublished, sortOrder: Number(b.sortOrder) || 50
  }
  const existing = (await db.select().from(s.infoPages).where(eq(s.infoPages.slug, slug)).limit(1))[0]
  if (existing) await db.update(s.infoPages).set(set).where(eq(s.infoPages.id, existing.id))
  else await db.insert(s.infoPages).values({ slug, ...set })
  return { ok: true, slug }
})
