import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, visibleSectionIds, pointTotals, sectionOf, sectionOfWith } from '../../utils/guard'
import { unitNames } from '../../utils/unitNames'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)     // sections this leader fully administers (null = all)
  const visIds = await visibleSectionIds(me)    // sections that should render at all (null = all)
  const totals = await pointTotals()
  const patrols = (await db.select().from(s.patrols)).sort((a, b) => a.sortOrder - b.sortOrder)
  const all = (await db.select().from(s.scouts))
  const badgeCounts = new Map<number, number>()
  for (const a of await db.select().from(s.scoutAchievements))
    badgeCounts.set(a.scoutId, (badgeCounts.get(a.scoutId) || 0) + 1)
  const scopes = (await db.select().from(s.leaderScopes))
  const leaderNames = new Map(all.filter(r => r.role !== 'scout').map(r => [r.id, r]))

  const patrolLeadersOf = (patrolId: number) =>
    scopes.filter(x => x.scope === 'patrol' && x.patrolId === patrolId).map(x => {
      const l = leaderNames.get(x.scoutId)
      return l ? { id: l.id, firstName: l.firstName, lastName: l.lastName, firstNameEn: l.firstNameEn, lastNameEn: l.lastNameEn, rank: x.rank } : null
    }).filter(Boolean)

  const memberRow = (r: any) => ({
    id: r.id, firstName: r.firstName, lastName: r.lastName,
    firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
    isActive: r.isActive, points: totals.get(r.id) || 0, badges: badgeCounts.get(r.id) || 0,
    patrolRole: r.patrolRole ?? null
  })

  const sections = (await db.select().from(s.sections))
    .filter(x => visIds === null || visIds.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(sec => {
      const secAdmin = secIds === null || secIds.includes(sec.id)     // full section power here
      const members = all.filter(r => r.role === 'scout' && sectionOfWith(r, patrols) === sec.id)
      const patrolsInSec = patrols.filter(p => p.sectionId === sec.id)
        .filter(() => secAdmin)
      return {
        id: sec.id, nameEl: sec.nameEl, nameEn: sec.nameEn, slug: sec.slug, canManage: secAdmin,
        unit: unitNames(sec.slug),
        patrols: patrolsInSec.map(p => ({
          id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem,
          leaders: patrolLeadersOf(p.id),
          scouts: members.filter(r => r.patrolId === p.id).map(memberRow)
        })),
        loose: secAdmin ? members.filter(r => r.patrolId == null).map(memberRow) : []
      }
    })

  return {
    sections,
    leaders: me.role === 'troop_leader'
      ? all.filter(r => r.role !== 'scout').map(r => ({
          id: r.id, firstName: r.firstName, lastName: r.lastName,
          firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, role: r.role, isChief: !!r.isChief,
          scopes: scopes.filter(x => x.scoutId === r.id).map(x => ({ scope: x.scope, sectionId: x.sectionId, patrolId: x.patrolId, rank: x.rank }))
        }))
      : null
  }
})
