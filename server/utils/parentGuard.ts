import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/** The signed-in parent, or 401. Their section is the only one they may read. */
export async function requireParent(event: H3Event) {
  const session = await getUserSession(event)
  const id = (session as any)?.parent?.id
  if (!id) throw createError({ statusCode: 401, message: 'Not signed in' })
  const row = (await (await useDb()).select().from(s.parents).where(eq(s.parents.id, id)).limit(1))[0]
  if (!row || !row.isActive) throw createError({ statusCode: 401, message: 'Not signed in' })
  return row
}
