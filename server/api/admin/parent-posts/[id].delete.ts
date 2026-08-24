import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const id = idParam(event)
  const db = (await useDb())
  const post = (await db.select().from(s.parentPosts).where(eq(s.parentPosts.id, id)).limit(1))[0]
  if (!post) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && (post.sectionId == null || !secIds.includes(post.sectionId)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  await db.delete(s.parentPosts).where(eq(s.parentPosts.id, id))
  if (post.fileId != null) await db.delete(s.files).where(eq(s.files.id, post.fileId))
  return { ok: true }
})
