import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, pointTotals, sectionOfWith } from '../../../utils/guard'
import { packSections, weekStartOf, nextMeetingFor } from '../../../utils/pack'

/** A pack sector's screen for its Βαθμοφόροι: this week's challenges and who
    has done them, and the standings — which are theirs alone to see, not the
    families'. Serves the Αγέλη and the Μικρή Αγέλη; ?section= picks which,
    defaulting to the first one this leader covers. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const secIds = await scopedSectionIds(me)
  const all = await packSections()
  const mine = all.filter(x => secIds === null || secIds.includes(x.id))
  if (!mine.length) throw createError({ statusCode: 403, message: 'Out of your sector' })
  const asked = Number(getQuery(event).section)
  const section = mine.find(x => x.id === asked) || mine[0]

  const week = String(getQuery(event).week || weekStartOf())
  const allPatrols = await db.select().from(s.patrols)
  const patrols = allPatrols.filter(x => x.sectionId === section.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const members = (await db.select().from(s.scouts))
    .filter(r => r.role === 'scout' && r.isActive)
    .filter(r => sectionOfWith(r as any, allPatrols) === section.id)

  const challenges = (await db.select().from(s.packChallenges))
    .filter(c => c.sectionId === section.id && c.weekStart === week)
    .sort((a, b) => a.id - b.id)
  const done = await db.select().from(s.packChallengeDone)

  const totals = await pointTotals()
  const member = (r: any) => ({
    id: r.id, firstName: r.firstName, lastName: r.lastName,
    firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
    patrolId: r.patrolId, points: totals.get(r.id) || 0
  })

  // both tables on one screen: the εξάδες against each other, then the λυκόπουλα
  const byPatrol = patrols.map(p => {
    const mine = members.filter(r => r.patrolId === p.id)
    return {
      id: p.id, nameEl: p.nameEl, emblem: p.emblem,
      size: mine.length,
      points: mine.reduce((n, r) => n + (totals.get(r.id) || 0), 0)
    }
  }).sort((a, b) => b.points - a.points)

  return {
    sectionId: section.id, weekStart: week,
    sections: mine.map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug })),
    nextMeeting: await nextMeetingFor(section.id),
    patrols: byPatrol,
    members: members.map(member).sort((a, b) => b.points - a.points),
    challenges: challenges.map(c => ({
      id: c.id, textEl: c.textEl, emoji: c.emoji,
      doneBy: done.filter(d => d.challengeId === c.id).map(d => d.scoutId)
    }))
  }
})
