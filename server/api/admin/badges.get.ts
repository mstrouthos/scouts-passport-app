import { useDb, schema as s } from '../../db'
import { requireLeader, scopedScouts } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const badges = db.select().from(s.achievements).all()
    .filter(b => !b.isArchived).sort((a, b) => a.sortOrder - b.sortOrder)
  const all = db.select().from(s.scoutAchievements).all()
  const mine = new Set(scopedScouts(me).map(r => r.id))
  return badges.map(b => ({
    id: b.id, icon: b.iconEmoji, titleEl: b.titleEl, titleEn: b.titleEn,
    descriptionEl: b.descriptionEl, descriptionEn: b.descriptionEn,
    awarded: all.filter(a => a.achievementId === b.id && mine.has(a.scoutId)).length,
    total: mine.size
  }))
})
