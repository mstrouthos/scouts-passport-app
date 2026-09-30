import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { isS3Ref, signedReadUrl } from '../../utils/storage'

/** A picture in an info page. Anyone signed in — a member, a leader, or a
    family — may see it, as they may read the pages; but only a picture some
    page actually shows, so this is no back door to other stored files. A
    leader may also see one just uploaded, before its page is saved. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad id' })
  const session: any = await getUserSession(event)
  if (!session?.user?.id) await requireParent(event)
  const db = await useDb()
  const f = (await db.select().from(s.files).where(eq(s.files.id, id)).limit(1))[0]
  if (!f || !f.mime.startsWith('image/')) throw createError({ statusCode: 404, message: 'Not found' })
  const ref = `/api/info-image/${id})`
  const used = (await db.select().from(s.infoPages)).some(p => (p.bodyEl || '').includes(ref) || (p.bodyEn || '').includes(ref))
  if (!used && !(session?.user?.id && f.uploadedBy === session.user.id))
    throw createError({ statusCode: 404, message: 'Not found' })
  if (isS3Ref(f.data)) return sendRedirect(event, await signedReadUrl(f.data, f.name, false), 302)
  setResponseHeader(event, 'Content-Type', f.mime)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
  return Buffer.from(f.data, 'base64')
})
