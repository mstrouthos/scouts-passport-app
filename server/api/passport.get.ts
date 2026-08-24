import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, pointTotals, sectionOf, sectionOfWith } from '../utils/guard'
import { BADGE_CATEGORIES } from '../db/passportData'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const totals = await pointTotals()
  const myPoints = totals.get(me.id) || 0

  const allPatrols = (await db.select().from(s.patrols))
  const mySection = sectionOfWith(me, allPatrols)
  const actives = (await db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')))
    .filter(r => r.isActive && sectionOfWith(r, allPatrols) === mySection)
  const rank = 1 + actives.filter(r => r.id !== me.id && (totals.get(r.id) || 0) > myPoints).length

  const badges = (await db.select().from(s.achievements))
    .filter(b => !b.isArchived).sort((a, b) => a.sortOrder - b.sortOrder)
  const earned = (await db.select().from(s.scoutAchievements).where(eq(s.scoutAchievements.scoutId, me.id)))
  const earnedMap = new Map(earned.map(e => [e.achievementId, e]))
  // what each Πτυχίο asks for, so tapping a badge can show it without a second call
  const reqs = await db.select().from(s.achievementRequirements)
  const reqsBy = new Map<number, string[]>()
  for (const r of reqs.sort((a, b) => a.idx - b.idx)) {
    const list = reqsBy.get(r.achievementId) || []
    list.push(r.textEl); reqsBy.set(r.achievementId, list)
  }

  return {
    points: myPoints, rank, totalScouts: actives.length,
    badges: badges.map(b => ({
      id: b.id, icon: b.iconEmoji, titleEl: b.titleEl, titleEn: b.titleEn,
      descriptionEl: b.descriptionEl, descriptionEn: b.descriptionEn,
      category: b.category,
      categoryEl: BADGE_CATEGORIES.find(c => c.slug === b.category)?.titleEl ?? null,
      categoryEmoji: BADGE_CATEGORIES.find(c => c.slug === b.category)?.emoji ?? '🏅',
      requirementsEl: reqsBy.get(b.id) || [],
      earned: earnedMap.has(b.id), completedOn: earnedMap.get(b.id)?.completedOn ?? null
    }))
  }
})
