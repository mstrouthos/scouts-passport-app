import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { can } from '../../utils/permissions'

/** The sections a leader works with, each with its family mailing list.

    Doubles as the section picker for announcements and events, so it stays
    readable for a Υπαρχηγός — but the addresses are stripped, since they are
    contact details and those are not theirs to see. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const seeContacts = await can(me, 'parents.view')
  const db = (await useDb())
  const secs = await scopedSectionIds(me)
  const contacts = (await db.select().from(s.familyContacts))
  return (await db.select().from(s.sections))
    .filter(x => secs === null || secs.includes(x.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({
      id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug,
      emails: seeContacts ? contacts.filter(c => c.sectionId === x.id).map(c => c.email) : []
    }))
})
