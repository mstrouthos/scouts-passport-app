import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now } from '../../utils/passcode'

/** Replace the parent email list for one section. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ sectionId?: number, emails?: string[] }>(event)
  const sectionId = Number(b?.sectionId)
  const secs = scopedSectionIds(me)
  if (!Number.isInteger(sectionId) || (secs !== null && !secs.includes(sectionId)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const emails = [...new Set((b?.emails || [])
    .map(e => String(e).trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
  const db = useDb()
  db.delete(s.familyContacts).where(eq(s.familyContacts.sectionId, sectionId)).run()
  if (emails.length) {
    db.insert(s.familyContacts).values(emails.map(email => ({
      sectionId, email, addedBy: me.id, createdAt: now()
    }))).run()
  }
  return { saved: emails.length }
})
