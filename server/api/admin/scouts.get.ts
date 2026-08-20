import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedPatrolIds, pointTotals } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const pids = scopedPatrolIds(me)
  const totals = pointTotals()
  const patrols = db.select().from(s.patrols).all()
    .filter(p => pids === null || pids.includes(p.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const all = db.select().from(s.scouts).all()
  const badgeCounts = new Map<number, number>()
  for (const a of db.select().from(s.scoutAchievements).all())
    badgeCounts.set(a.scoutId, (badgeCounts.get(a.scoutId) || 0) + 1)

  const scopes = db.select().from(s.leaderScopes).all()
  return {
    patrols: patrols.map(p => ({
      id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem,
      scouts: all.filter(r => r.role === 'scout' && r.patrolId === p.id).map(r => ({
        id: r.id, firstName: r.firstName, lastName: r.lastName,
        firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
        isActive: r.isActive, points: totals.get(r.id) || 0, badges: badgeCounts.get(r.id) || 0
      }))
    })),
    leaders: me.role === 'troop_leader'
      ? all.filter(r => r.role !== 'scout').map(r => ({
          id: r.id, firstName: r.firstName, lastName: r.lastName,
          firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, role: r.role,
          scopes: scopes.filter(x => x.scoutId === r.id).map(x => ({ scope: x.scope, patrolId: x.patrolId }))
        }))
      : null
  }
})
