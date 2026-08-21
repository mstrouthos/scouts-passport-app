import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

/** Sections that can actually run a quiz — i.e. the ones whose members have
    app accounts. Αγέλη and Μικρή Αγέλη have no member logins (they use the
    public parents' page), so they never appear here. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secs = await scopedSectionIds(me)
  return (await db.select().from(s.sections))
    .filter(x => x.hasApp && (secs === null || secs.includes(x.id)))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug }))
})
