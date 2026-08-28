import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, pointTotals, sectionOfWith } from '../../../utils/guard'
import { packSections } from '../../../utils/pack'

/** The Αγέλη's and Μικρή Αγέλη's standings, for their own Βαθμοφόροι's
    dashboard. Never leaves this side of the app: families read the weekly
    challenges and the next συγκέντρωση, not who is ahead. One block per pack
    sector the leader covers. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const secIds = await scopedSectionIds(me)
  const mine = (await packSections()).filter(x => secIds === null || secIds.includes(x.id))
  if (!mine.length) return []

  const allPatrols = await db.select().from(s.patrols)
  const scouts = (await db.select().from(s.scouts)).filter(r => r.role === 'scout' && r.isActive)
  const totals = await pointTotals()

  return mine.map(section => {
    const members = scouts.filter(r => sectionOfWith(r as any, allPatrols) === section.id)
    const patrols = allPatrols
      .filter(p => p.sectionId === section.id)
      .map(p => {
        const its = members.filter(r => r.patrolId === p.id)
        return {
          id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem,
          size: its.length,
          points: its.reduce((n, r) => n + (totals.get(r.id) || 0), 0)
        }
      })
      .sort((a, b) => b.points - a.points)
    return {
      sectionId: section.id, nameEl: section.nameEl, nameEn: section.nameEn,
      patrols,
      members: members
        .map(r => ({
          id: r.id, firstName: r.firstName, lastName: r.lastName,
          firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
          patrolId: r.patrolId, points: totals.get(r.id) || 0
        }))
        .sort((a, b) => b.points - a.points)
    }
  })
})
