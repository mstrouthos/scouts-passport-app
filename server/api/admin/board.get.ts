import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { quizSections } from '../../utils/quizSector'
import { boardFor } from '../../utils/board'

/** The quiz's league table, for the Βαθμοφόροι of the sector whose quiz it
    is — and only theirs: a leader sees the sectors that run the quiz inside
    their own area of responsibility (all of them for a troop-wide one), and
    nothing else. ?section= picks one when they cover more than one. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const secIds = await scopedSectionIds(me)
  const sections = (await quizSections())
    .filter(x => secIds === null || secIds.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  if (!sections.length) throw createError({ statusCode: 403, message: 'No quiz sector in your area' })
  const want = Number(getQuery(event).section)
  const section = sections.find(x => x.id === want) || sections[0]
  return {
    sectionId: section.id,
    sections: sections.map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn })),
    ...(await boardFor(section.id))
  }
})
