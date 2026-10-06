import { badgeArt } from '../../../utils/art'
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
    id: b.id, icon: b.iconEmoji, art: badgeArt(b.slug), titleEl: b.titleEl, titleEn: b.titleEn,
    category: b.category, slug: b.slug,
    descriptionEl: b.descriptionEl, descriptionEn: b.descriptionEn,
    awarded: all.filter(a => a.achievementId === b.id && mine.has(a.scoutId)).length,
    // who already has it — marked on the award page, where it can be taken back
    holders: all.filter(a => a.achievementId === b.id && mine.has(a.scoutId)).map(a => a.scoutId),
    total: mine.size
  }))
})
