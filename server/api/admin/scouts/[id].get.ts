import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, assertScoutInScope, idParam, pointTotals, sectionOf } from '../../../utils/guard'
import { can } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  // a Υπαρχηγός may see who is in their sector, not how to reach them
  const canSeeDetails = await can(me, 'roster.viewDetails')
  const id = idParam(event)
  await assertScoutInScope(me, id)
  const db = (await useDb())
  const r = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]!
  const patrol = r.patrolId ? (await db.select().from(s.patrols).where(eq(s.patrols.id, r.patrolId)).limit(1))[0] : null
  const sid = await sectionOf(r)
  const section = sid != null ? (await db.select().from(s.sections).where(eq(s.sections.id, sid)).limit(1))[0] : null
  const earned = (await db.select().from(s.scoutAchievements).where(eq(s.scoutAchievements.scoutId, id)))
  const badges = (await db.select().from(s.achievements))
  const earnedIds = new Set(earned.map(e => e.achievementId))
  return {
    id: r.id, firstName: r.firstName, lastName: r.lastName,
    firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, isActive: r.isActive,
    phone: canSeeDetails ? r.phone : null, idNumber: canSeeDetails ? r.idNumber : null,
    canSeeDetails,
    patrol: patrol && { id: patrol.id, nameEl: patrol.nameEl, nameEn: patrol.nameEn, emblem: patrol.emblem },
    section: section && { id: section.id, nameEl: section.nameEl, nameEn: section.nameEn, slug: section.slug },
    points: (await pointTotals()).get(id) || 0,
    badges: badges.filter(b => !b.isArchived).sort((a, b) => a.sortOrder - b.sortOrder).map(b => ({
      id: b.id, icon: b.iconEmoji, titleEl: b.titleEl, titleEn: b.titleEn, earned: earnedIds.has(b.id)
    }))
  }
})
