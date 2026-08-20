import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = useDb()
  const patrol = db.select().from(s.patrols).where(eq(s.patrols.id, id)).get()
  if (!patrol) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(patrol.sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const b = await readBody<{ nameEl?: string, nameEn?: string, emblem?: string }>(event)
  const set: any = {}
  if (b?.nameEl) set.nameEl = String(b.nameEl).trim()
  if (b?.nameEn !== undefined) set.nameEn = b.nameEn || null
  if (b?.emblem) set.emblem = String(b.emblem).trim()
  if (Object.keys(set).length) db.update(s.patrols).set(set).where(eq(s.patrols.id, id)).run()
  return { ok: true }
})
