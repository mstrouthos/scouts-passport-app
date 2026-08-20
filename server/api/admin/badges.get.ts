import { useDb, schema as s } from '../../db'
import { requireLeader, scopedScouts } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const badges = (await db.select().from(s.achievements))
    .filter(b => !b.isArchived).sort((a, b) => a.sortOrder - b.sortOrder)
  const all = (await db.select().from(s.scoutAchievements))
  const mine = new Set((await scopedScouts(me)).map(r => r.id))
  return badges.map(b => ({
    id: b.id, icon: b.iconEmoji, titleEl: b.titleEl, titleEn: b.titleEn,
    descriptionEl: b.descriptionEl, descriptionEn: b.descriptionEn,
    awarded: all.filter(a => a.achievementId === b.id && mine.has(a.scoutId)).length,
    total: mine.size
  }))
})
