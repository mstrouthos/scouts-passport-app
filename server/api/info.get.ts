import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const rows = (await (await useDb()).select().from(s.infoPages))
    .filter(p => p.isPublished || me.role !== 'scout')
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return rows.map(p => ({
    slug: p.slug, icon: p.iconEmoji, titleEl: p.titleEl, titleEn: p.titleEn,
    summaryEl: p.summaryEl, summaryEn: p.summaryEn, isPublished: p.isPublished
  }))
})
