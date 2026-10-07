import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { useDb, schema as s } from '../../db'
import { boardFor } from '../../utils/board'

/** The league table of a sector whose members use the app (the Ομάδα, the
    Κοινότητα), for its own Βαθμοφόροι — a leader sees those inside their own
    area of responsibility (all of them for a troop-wide one), and nothing
    else. ?section= picks one when they cover more than one. The Αγέλες, whose
    children never sign in, have their standings (admin/pack/standings). */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const secIds = await scopedSectionIds(me)
  const db = await useDb()
  const sections = (await db.select().from(s.sections))
    .filter(x => x.hasApp && (secIds === null || secIds.includes(x.id)))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  if (!sections.length) return { sectionId: null, sections: [] }
  const want = Number(getQuery(event).section)
  const section = sections.find(x => x.id === want) || sections[0]
  return {
    sectionId: section.id,
    sections: sections.map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn })),
    ...(await boardFor(section.id))
  }
})
