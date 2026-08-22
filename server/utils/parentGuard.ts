import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sectionOfParent } from './parents'

/** The signed-in parent, or 401.

   sectionId is resolved from their child, so everything a parent can read
   follows the kid — including when the kid moves up a section. Parents added
   before the link existed keep the section they were filed under. */
export async function requireParent(event: H3Event) {
  const session = await getUserSession(event)
  const id = (session as any)?.parent?.id
  if (!id) throw createError({ statusCode: 401, message: 'Not signed in' })
  const db = await useDb()
  const row = (await db.select().from(s.parents).where(eq(s.parents.id, id)).limit(1))[0]
  if (!row || !row.isActive) throw createError({ statusCode: 401, message: 'Not signed in' })
  const sectionId = sectionOfParent(row, await db.select().from(s.scouts), await db.select().from(s.patrols))
  if (sectionId == null) throw createError({ statusCode: 403, message: 'Το παιδί σας δεν έχει τμήμα ακόμη' })
  return { ...row, sectionId }
}
