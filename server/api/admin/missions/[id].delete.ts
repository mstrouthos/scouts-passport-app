import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'
import { canManage, missionById } from '../../../utils/missions'
import { deleteStored } from '../../../utils/storage'

/** A mission taken away, with its photos (from the bucket too). Points
    already given for it stay: they were earned. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const m = await missionById(idParam(event))
  if (!(await canManage(me, m))) throw createError({ statusCode: 403, message: 'Δεν είναι στον τομέα σας' })
  const db = await useDb()
  const subs = await db.select().from(s.missionSubmissions).where(eq(s.missionSubmissions.missionId, m.id))
  const files = subs.length ? await db.select().from(s.files).where(inArray(s.files.id, subs.map(x => x.fileId))) : []
  await db.delete(s.missionSubmissions).where(eq(s.missionSubmissions.missionId, m.id))
  for (const f of files) { await deleteStored(f.data).catch(() => {}); await db.delete(s.files).where(eq(s.files.id, f.id)) }
  await db.delete(s.missions).where(eq(s.missions.id, m.id))
  return { ok: true }
})
