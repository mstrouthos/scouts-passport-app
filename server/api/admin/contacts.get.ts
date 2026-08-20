import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secs = await scopedSectionIds(me)
  const contacts = (await db.select().from(s.familyContacts))
  return (await db.select().from(s.sections))
    .filter(x => secs === null || secs.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({
      id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug,
      emails: contacts.filter(c => c.sectionId === x.id).map(c => c.email)
    }))
})
