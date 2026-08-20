import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, assertScoutInScope, idParam, pointTotals } from '../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  assertScoutInScope(me, id)
  const db = useDb()
  const r = db.select().from(s.scouts).where(eq(s.scouts.id, id)).get()!
  const patrol = r.patrolId ? db.select().from(s.patrols).where(eq(s.patrols.id, r.patrolId)).get() : null
  const earned = db.select().from(s.scoutAchievements).where(eq(s.scoutAchievements.scoutId, id)).all()
  const badges = db.select().from(s.achievements).all()
  const earnedIds = new Set(earned.map(e => e.achievementId))
  return {
    id: r.id, firstName: r.firstName, lastName: r.lastName,
    firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, isActive: r.isActive,
    patrol: patrol && { id: patrol.id, nameEl: patrol.nameEl, nameEn: patrol.nameEn, emblem: patrol.emblem },
    points: pointTotals().get(id) || 0,
    badges: badges.filter(b => !b.isArchived).sort((a, b) => a.sortOrder - b.sortOrder).map(b => ({
      id: b.id, icon: b.iconEmoji, titleEl: b.titleEl, titleEn: b.titleEn, earned: earnedIds.has(b.id)
    }))
  }
})
