import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

/** The sections a leader works with — the section picker for announcements
    and events. The per-section mailing list that used to live here is gone:
    parents are reached through their children now. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secs = await scopedSectionIds(me)
  return (await db.select().from(s.sections))
    .filter(x => secs === null || secs.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug, emails: [] as string[] }))
})
