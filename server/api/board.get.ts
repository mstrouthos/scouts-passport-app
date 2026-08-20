import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, pointTotals, sectionOf } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = useDb()
  const totals = pointTotals()
  const allPatrols = db.select().from(s.patrols).all()
  const mySection = sectionOf(me, allPatrols)
  const actives = db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')).all()
    .filter(r => r.isActive && sectionOf(r, allPatrols) === mySection)
  const patrols = allPatrols.filter(p => p.sectionId === mySection)

  const individual = actives.map(r => ({
    id: r.id, me: r.id === me.id,
    firstName: r.firstName, lastName: r.lastName, firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
    patrolId: r.patrolId, points: totals.get(r.id) || 0
  })).sort((a, b) => b.points - a.points)

  const patrolBoard = patrols.map(p => {
    const members = actives.filter(r => r.patrolId === p.id)
    const sum = members.reduce((acc, r) => acc + (totals.get(r.id) || 0), 0)
    return {
      id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem,
      members: members.length, avg: members.length ? Math.round(sum / members.length) : 0
    }
  }).sort((a, b) => b.avg - a.avg)

  return {
    individual,
    patrols: patrolBoard,
    patrolNames: Object.fromEntries(patrols.map(p => [p.id, { nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem }]))
  }
})
