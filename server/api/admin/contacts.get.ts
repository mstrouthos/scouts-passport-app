import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const secs = scopedSectionIds(me)
  const contacts = db.select().from(s.familyContacts).all()
  return db.select().from(s.sections).all()
    .filter(x => secs === null || secs.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({
      id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug,
      emails: contacts.filter(c => c.sectionId === x.id).map(c => c.email)
    }))
})
