import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const id = idParam(event)
  const db = (await useDb())
  const patrol = (await db.select().from(s.patrols).where(eq(s.patrols.id, id)).limit(1))[0]
  if (!patrol) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(patrol.sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const b = await readBody<{ nameEl?: string, nameEn?: string, emblem?: string }>(event)
  const set: any = {}
  if (b?.nameEl) set.nameEl = String(b.nameEl).trim()
  if (b?.nameEn !== undefined) set.nameEn = b.nameEn || null
  if (b?.emblem) set.emblem = String(b.emblem).trim()
  // the unit's κραυγή, which the Αγέλη's families see
  if (Object.keys(set).length) await db.update(s.patrols).set(set).where(eq(s.patrols.id, id))
  return { ok: true }
})
