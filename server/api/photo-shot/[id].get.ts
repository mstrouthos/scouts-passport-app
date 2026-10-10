import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, idParam } from '../../utils/guard'
import { isS3Ref, signedReadUrl } from '../../utils/storage'

/** A photo of the photo game, for any Βαθμοφόρος once its round is over (to
    its sender, any time) — only a photo of the game, so this is no back door
    to other stored files. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const shot = (await db.select().from(s.photoShots).where(eq(s.photoShots.fileId, id)).limit(1))[0]
  if (!shot) throw createError({ statusCode: 404, message: 'Not found' })
  const round = (await db.select().from(s.photoRounds).where(eq(s.photoRounds.id, shot.roundId)).limit(1))[0]
  if (!round?.endedAt && shot.scoutId !== me.id) throw createError({ statusCode: 404, message: 'Not found' })
  const f = (await db.select().from(s.files).where(eq(s.files.id, id)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  if (isS3Ref(f.data)) return sendRedirect(event, await signedReadUrl(f.data, f.name, false), 302)
  setResponseHeader(event, 'Content-Type', f.mime)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
  return Buffer.from(f.data, 'base64')
})
