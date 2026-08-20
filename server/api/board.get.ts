import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, pointTotals, sectionOf, sectionOfWith } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const totals = await pointTotals()
  const allPatrols = (await db.select().from(s.patrols))
  const mySection = sectionOfWith(me, allPatrols)
  const actives = (await db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')))
    .filter(r => r.isActive && sectionOfWith(r, allPatrols) === mySection)
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
