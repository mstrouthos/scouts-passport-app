import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { isS3Ref, signedReadUrl } from '../../utils/storage'

/** Serve an attached PDF — inline for the in-page viewer, or as a download
    with ?download=1. Readable by a signed-in leader, or by a parent with a
    child in the sector the post belongs to (any of their sectors, not only
    the first). A file in the bucket is handed over as a short-lived signed
    URL once that check has passed. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad id' })
  const db = (await useDb())
  const download = String(getQuery(event).download || '') === '1'

  const session = await getUserSession(event)
  const isLeader = !!(session as any)?.user?.id
  if (!isLeader) {
    const parent = await requireParent(event)
    const post = (await db.select().from(s.parentPosts)).find(x => x.fileId === id)
    if (!post || !post.isPublished || (post.sectionId != null && !parent.sectionIds.includes(post.sectionId)))
      throw createError({ statusCode: 403, message: 'Not yours' })
  }

  const f = (await db.select().from(s.files).where(eq(s.files.id, id)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  if (isS3Ref(f.data)) return sendRedirect(event, await signedReadUrl(f.data, f.name, download), 302)
  setResponseHeader(event, 'Content-Type', f.mime)
  setResponseHeader(event, 'Content-Disposition', `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(f.name)}`)
  return Buffer.from(f.data, 'base64')
})
