import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'
import { canManage, missionById } from '../../../utils/missions'
import { clean } from '../missions.post'

/** A mission changed: its words, its points, when it closes. Points already
    given for it stay as they were. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const m = await missionById(idParam(event))
  const fields = clean(await readBody<any>(event))
  if (!(await canManage(me, m)) || !(await canManage(me, fields))) throw createError({ statusCode: 403, message: 'Δεν είναι στον τομέα σας' })
  const db = await useDb()
  await db.update(s.missions).set({ ...fields, opensAt: fields.opensAt || m.opensAt }).where(eq(s.missions.id, m.id))
  return { ok: true }
})
