import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const db = useDb()
  const scopes = db.select().from(s.leaderScopes).all()
  const patrols = db.select().from(s.patrols).all()
  return {
    leaders: db.select().from(s.scouts).all().filter(r => r.role !== 'scout').map(r => ({
      id: r.id, firstName: r.firstName, lastName: r.lastName,
      firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, role: r.role,
      scopes: scopes.filter(x => x.scoutId === r.id).map(x => ({ scope: x.scope, patrolId: x.patrolId }))
    })),
    scouts: db.select().from(s.scouts).all().filter(r => r.role === 'scout' && r.isActive).map(r => ({
      id: r.id, firstName: r.firstName, lastName: r.lastName, firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn
    })),
    patrols: patrols.map(p => ({ id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem }))
  }
})
