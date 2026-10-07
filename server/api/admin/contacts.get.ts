import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

/** The sections a leader works with — the section picker for announcements
    and events. The per-section mailing list that used to live here is gone:
    parents are reached through their children now. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secs = await scopedSectionIds(me)
  // ?all=1: every sector, each marked whether it is theirs — an event of
  // theirs may be shared with the others
  const all = !!getQuery(event).all
  return (await db.select().from(s.sections))
    .filter(x => all || secs === null || secs.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug, mine: secs === null || secs.includes(x.id), emails: [] as string[] }))
})
