import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { isS3Ref, signedReadUrl } from '../../../utils/storage'
import { canManage } from '../../../utils/missions'

/** A mission photo: to the member who sent it, and to the Βαθμοφόροι who
    check that mission. Nobody else — not other members, not families. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = await useDb()
  const sub = (await db.select().from(s.missionSubmissions).where(eq(s.missionSubmissions.id, idParam(event))).limit(1))[0]
  if (!sub) throw createError({ statusCode: 404, message: 'Not found' })
  if (sub.scoutId !== me.id) {
    const m = (await db.select().from(s.missions).where(eq(s.missions.id, sub.missionId)).limit(1))[0]
    if (me.role === 'scout' || !m || !(await canManage(me, m))) throw createError({ statusCode: 404, message: 'Not found' })
  }
  const f = (await db.select().from(s.files).where(eq(s.files.id, sub.fileId)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  if (isS3Ref(f.data)) return sendRedirect(event, await signedReadUrl(f.data, f.name, false), 302)
  setResponseHeader(event, 'Content-Type', f.mime)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
  return Buffer.from(f.data, 'base64')
})
