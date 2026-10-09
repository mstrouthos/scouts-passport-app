import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, idParam } from '../../utils/guard'
import { canPhoto } from '../../utils/photoGame'
import { isS3Ref, signedReadUrl } from '../../utils/storage'

/** A winning photo of the photo game, for those who play it (and the Αρχηγός
    Συστήματος) — only a photo that won a place, so this is no back door to
    other stored files. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (!canPhoto(me) && me.role !== 'troop_leader') throw createError({ statusCode: 404, message: 'Not found' })
  const id = idParam(event)
  const db = await useDb()
  const won = (await db.select().from(s.photoShots).where(eq(s.photoShots.fileId, id)).limit(1))[0]
  if (!won?.place) throw createError({ statusCode: 404, message: 'Not found' })
  const f = (await db.select().from(s.files).where(eq(s.files.id, id)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  if (isS3Ref(f.data)) return sendRedirect(event, await signedReadUrl(f.data, f.name, false), 302)
  setResponseHeader(event, 'Content-Type', f.mime)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
  return Buffer.from(f.data, 'base64')
})
