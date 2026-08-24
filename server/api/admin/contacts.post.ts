import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { assertCan } from '../../utils/permissions'

/** Replace the parent email list for one section. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const b = await readBody<{ sectionId?: number, emails?: string[] }>(event)
  const sectionId = Number(b?.sectionId)
  const secs = await scopedSectionIds(me)
  if (!Number.isInteger(sectionId) || (secs !== null && !secs.includes(sectionId)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const emails = [...new Set((b?.emails || [])
    .map(e => String(e).trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
  const db = (await useDb())
  await db.delete(s.familyContacts).where(eq(s.familyContacts.sectionId, sectionId))
  if (emails.length) {
    await db.insert(s.familyContacts).values(emails.map(email => ({
      sectionId, email, addedBy: me.id, createdAt: now()
    })))
  }
  return { saved: emails.length }
})
