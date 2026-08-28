import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { quizSections } from '../../utils/quizSector'

/** Sections that run the quiz — the Ομάδα Προσκόπων alone. The Αγέλες have no
    member logins at all, and the Κοινότητα runs the Η.Κ.Α.Δ.Ε. instead. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const secs = await scopedSectionIds(me)
  return (await quizSections())
    .filter(x => secs === null || secs.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug }))
})
