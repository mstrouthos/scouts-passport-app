import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { pointTotals, sectionOfWith } from './guard'
import { getTeamScoring, teamScore } from './settings'
import { faceOf } from './face'
import { isBirthday } from '../../utils/season'

/** One sector's league table: its real members by points, and its units by
    the sector's own rule (sum or average). A hidden test account is in it
    neither as a row nor inside its unit's score. `meId` marks the viewer's
    own row, when they are in it. */
export async function boardFor(sectionId: number | null, meId?: number) {
  const db = await useDb()
  const totals = await pointTotals()
  const allPatrols = await db.select().from(s.patrols)
  const actives = (await db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')))
    .filter(r => r.isActive && !r.isHidden && sectionOfWith(r, allPatrols) === sectionId)
  const patrols = allPatrols.filter(p => p.sectionId === sectionId)
  const mode = await getTeamScoring(sectionId)

  const individual = actives.map(r => ({
    id: r.id, me: r.id === meId,
    firstName: r.firstName, lastName: r.lastName, firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
    patrolId: r.patrolId, points: totals.get(r.id) || 0, avatar: faceOf(r).avatar,
    // only whether it is today, never the date
    birthday: isBirthday(r.birthday)
  })).sort((a, b) => b.points - a.points)

  const patrolBoard = patrols.map(p => {
    const members = actives.filter(r => r.patrolId === p.id)
    const sum = members.reduce((acc, r) => acc + (totals.get(r.id) || 0), 0)
    return {
      id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem,
      members: members.length, score: teamScore(sum, members.length, mode)
    }
  }).sort((a, b) => b.score - a.score)

  return {
    individual,
    patrols: patrolBoard,
    teamScoring: mode,
    patrolNames: Object.fromEntries(patrols.map(p => [p.id, { nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem }]))
  }
}
