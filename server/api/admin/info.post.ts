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
  // null = written once for the whole troop; a section id = only that sector
  const sectionId = b?.sectionId == null || b.sectionId === '' ? null : Number(b.sectionId)
  if (sectionId != null && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'Bad section' })

  // a page is identified by slug *and* sector, so "Στολές" can differ per sector
  const existing = (await db.select().from(s.infoPages))
    .find(x => x.slug === slug && (x.sectionId ?? null) === sectionId)
  if (existing) await db.update(s.infoPages).set({ ...set, sectionId }).where(eq(s.infoPages.id, existing.id))
  else await db.insert(s.infoPages).values({ slug, sectionId, ...set })
  return { ok: true, slug, sectionId }
})
