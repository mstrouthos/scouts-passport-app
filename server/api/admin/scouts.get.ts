import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, visibleSectionIds, directPatrolIds, pointTotals, sectionOf } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const secIds = scopedSectionIds(me)     // sections this leader fully administers (null = all)
  const visIds = visibleSectionIds(me)    // sections that should render at all (null = all)
  const patOnly = directPatrolIds(me)     // patrols granted directly (patrol-level leaders)
  const totals = pointTotals()
  const patrols = db.select().from(s.patrols).all().sort((a, b) => a.sortOrder - b.sortOrder)
  const all = db.select().from(s.scouts).all()
  const badgeCounts = new Map<number, number>()
  for (const a of db.select().from(s.scoutAchievements).all())
    badgeCounts.set(a.scoutId, (badgeCounts.get(a.scoutId) || 0) + 1)
  const scopes = db.select().from(s.leaderScopes).all()
  const leaderNames = new Map(all.filter(r => r.role !== 'scout').map(r => [r.id, r]))

  const patrolLeadersOf = (patrolId: number) =>
    scopes.filter(x => x.scope === 'patrol' && x.patrolId === patrolId).map(x => {
      const l = leaderNames.get(x.scoutId)
      return l ? { id: l.id, firstName: l.firstName, lastName: l.lastName, firstNameEn: l.firstNameEn, lastNameEn: l.lastNameEn, rank: x.rank } : null
    }).filter(Boolean)

  const memberRow = (r: any) => ({
    id: r.id, firstName: r.firstName, lastName: r.lastName,
    firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
    isActive: r.isActive, points: totals.get(r.id) || 0, badges: badgeCounts.get(r.id) || 0
  })

  const sections = db.select().from(s.sections).all()
    .filter(x => visIds === null || visIds.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(sec => {
      const secAdmin = secIds === null || secIds.includes(sec.id)     // full section power here
      const members = all.filter(r => r.role === 'scout' && sectionOf(r, patrols) === sec.id)
      const patrolsInSec = patrols.filter(p => p.sectionId === sec.id)
        .filter(p => secAdmin || patOnly.includes(p.id))
      return {
        id: sec.id, nameEl: sec.nameEl, nameEn: sec.nameEn, slug: sec.slug, canManage: secAdmin,
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
