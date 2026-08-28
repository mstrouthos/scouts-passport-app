import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, scopeKind, visibleSectionIds, rankOf, sectionOf } from '../utils/guard'
import { can } from '../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const patrol = me.patrolId ? (await db.select().from(s.patrols).where(eq(s.patrols.id, me.patrolId)).limit(1))[0] : null
  const mySectionId = await sectionOf(me)
  const section = mySectionId != null ? (await db.select().from(s.sections).where(eq(s.sections.id, mySectionId)).limit(1))[0] : null

  const isLeader = me.role !== 'scout'
  const kind = isLeader ? await scopeKind(me) : null
  const visIds = isLeader ? await visibleSectionIds(me) : null
  const allSections = (await db.select().from(s.sections)).sort((a, b) => a.sortOrder - b.sortOrder)
  const scopeSections = !isLeader ? null
    : (visIds === null ? null : allSections.filter(x => visIds.includes(x.id)))

  // Βαθμοφόροι are scoped to sectors; nobody is granted a single unit any more
  const myPatrols: any[] = []

  return {
    id: me.id, firstName: me.firstName, lastName: me.lastName,
    firstNameEn: me.firstNameEn, lastNameEn: me.lastNameEn,
    role: me.role, locale: me.locale,
    phone: me.phone, email: me.email, birthday: me.birthday,
    rank: isLeader ? await rankOf(me) : null,
    isChief: !!me.isChief,
    scopeKind: kind,
    patrol: patrol && { id: patrol.id, nameEl: patrol.nameEl, nameEn: patrol.nameEn, emblem: patrol.emblem },
    section: section && { id: section.id, nameEl: section.nameEl, nameEn: section.nameEn, slug: section.slug },
    myPatrols,
    // null = all sectors (admin / troop scope); otherwise the leader's visible sections
    scopeSections: scopeSections?.map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug, hasApp: x.hasApp })) ?? null,
    // the UI hides what the API would refuse, so a Υπαρχηγός is not shown
    // buttons that only produce a 403
    can: !isLeader ? null : {
      rosterEdit: await can(me, 'roster.edit'),
      rosterAdd: await can(me, 'roster.addMember'),
      rosterDetails: await can(me, 'roster.viewDetails'),
      parents: await can(me, 'parents.view'),
      events: await can(me, 'events.edit'),
      settings: await can(me, 'settings.edit'),
      challenges: await can(me, 'challenge.write'),
      requirements: await can(me, 'requirements.award'),
      badges: await can(me, 'badges.award')
    }
  }
})
