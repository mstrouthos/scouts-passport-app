import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, scopeKind, visibleSectionIds, rankOf, sectionOf, directPatrolIds } from '../utils/guard'

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

  let myPatrols: any[] = []
  if (isLeader && kind === 'patrol') {
    const pids = await directPatrolIds(me)
    myPatrols = (await db.select().from(s.patrols)).filter(p => pids.includes(p.id))
      .map(p => ({ id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem, sectionId: p.sectionId }))
  }

  return {
    id: me.id, firstName: me.firstName, lastName: me.lastName,
    firstNameEn: me.firstNameEn, lastNameEn: me.lastNameEn,
    role: me.role, locale: me.locale,
    rank: isLeader ? await rankOf(me) : null,
    isChief: !!me.isChief,
    scopeKind: kind,
    patrol: patrol && { id: patrol.id, nameEl: patrol.nameEl, nameEn: patrol.nameEn, emblem: patrol.emblem },
    section: section && { id: section.id, nameEl: section.nameEl, nameEn: section.nameEn, slug: section.slug },
    myPatrols,
    // null = all sectors (admin / troop scope); otherwise the leader's visible sections
    scopeSections: scopeSections?.map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug, hasApp: x.hasApp })) ?? null
  }
})
