import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, pointTotals, sectionOf, sectionOfWith } from '../utils/guard'

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

  return {
    points: myPoints, rank, totalScouts: actives.length,
    badges: badges.map(b => ({
      id: b.id, icon: b.iconEmoji, titleEl: b.titleEl, titleEn: b.titleEn,
      descriptionEl: b.descriptionEl, descriptionEn: b.descriptionEn,
      earned: earnedMap.has(b.id), completedOn: earnedMap.get(b.id)?.completedOn ?? null
    }))
  }
})
