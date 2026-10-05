import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { isS3Ref, signedReadUrl } from '../../utils/storage'

/** A Βαθμοφόρος's profile photo, to anyone signed in — member, leader or
    family. Only a file that is someone's photo right now: no back door to
    other stored files. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad id' })
  const session: any = await getUserSession(event)
  if (!session?.user?.id) await requireParent(event)
  const db = await useDb()
  const owner = (await db.select({ id: s.scouts.id, role: s.scouts.role }).from(s.scouts).where(eq(s.scouts.photoFileId, id)).limit(1))[0]
  if (!owner || owner.role === 'scout') throw createError({ statusCode: 404, message: 'Not found' })
  const f = (await db.select().from(s.files).where(eq(s.files.id, id)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  if (isS3Ref(f.data)) return sendRedirect(event, await signedReadUrl(f.data, f.name, false), 302)
  setResponseHeader(event, 'Content-Type', f.mime)
  // the id changes with every new photo, so it can be kept a while
  setResponseHeader(event, 'Cache-Control', 'private, max-age=604800')
  return Buffer.from(f.data, 'base64')
})
