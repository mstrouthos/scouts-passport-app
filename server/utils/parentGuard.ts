import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sectionOfWith } from './guard'
import { markSeenParent } from './seen'

/** The signed-in parent, or 401.

   A parent may have children in more than one sector, so what they can read is
   the union of their children's sections — never a single one. sectionId is
   kept as the first of those, for the places that still show one. */
export async function requireParent(event: H3Event) {
  const session = await getUserSession(event)
  const id = (session as any)?.parent?.id
  if (!id) throw createError({ statusCode: 401, message: 'Not signed in' })
  const db = await useDb()
  const row = (await db.select().from(s.parents).where(eq(s.parents.id, id)).limit(1))[0]
  if (!row || !row.isActive) throw createError({ statusCode: 401, message: 'Not signed in' })
  await markSeenParent(row)

  const links = (await db.select().from(s.parentChildren)).filter(x => x.parentId === id)
  const childIds = [...new Set([...links.map(x => x.scoutId), ...(row.scoutId != null ? [row.scoutId] : [])])]
  const scouts = await db.select().from(s.scouts)
  const patrols = await db.select().from(s.patrols)
  const children = childIds.map(cid => scouts.find(x => x.id === cid)).filter(Boolean) as any[]
  const sectionIds = [...new Set(children.map(c => sectionOfWith(c, patrols)).filter(x => x != null))] as number[]

  // a parent added before the link existed falls back to the section they were filed under
  if (!sectionIds.length && row.sectionId != null) sectionIds.push(row.sectionId)
  if (!sectionIds.length)
    throw createError({ statusCode: 403, message: 'Τα παιδιά σας δεν έχουν τμήμα ακόμη' })

  return {
    ...row,
    sectionId: sectionIds[0],
    sectionIds,
    children: children.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }))
  }
}
