import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'

/** Serve an attached PDF. Readable by a signed-in leader, or by a parent whose
    section the post belongs to — never anonymously. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad id' })
  const db = (await useDb())

  const session = await getUserSession(event)
  const isLeader = !!(session as any)?.user?.id
  if (!isLeader) {
    const parent = await requireParent(event)
    const post = (await db.select().from(s.parentPosts)).find(x => x.fileId === id)
    if (!post || !post.isPublished || (post.sectionId != null && post.sectionId !== parent.sectionId))
      throw createError({ statusCode: 403, message: 'Not yours' })
  }

  const f = (await db.select().from(s.files).where(eq(s.files.id, id)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  setResponseHeader(event, 'Content-Type', f.mime)
  setResponseHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(f.name)}"`)
  return Buffer.from(f.data, 'base64')
})
