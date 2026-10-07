import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { idParam } from '../../../../../utils/guard'
import { formForLeader, logAccess } from '../../../../../utils/forms'
import { registerChildren, unregisterResponse, registrationOptions } from '../../../../../utils/registrations'

/** Which children a registration answer registers, set by a leader: for an
    answer sent by plain link (a typed name), or to put one right. */
export default defineEventHandler(async (event) => {
  const id = idParam(event)
  const db = await useDb()
  const r = (await db.select().from(s.formResponses).where(eq(s.formResponses.id, id)).limit(1))[0]
  if (!r) throw createError({ statusCode: 404, message: 'Not found' })
  const { me, f } = await formForLeader(event, r.formId)
  if (!f.registrationYear) throw createError({ statusCode: 400, message: 'Η φόρμα δεν είναι εγγραφή χρονιάς' })
  const allowed = new Set((await registrationOptions(me, f)).map(k => k.id))
  const ids = [...new Set(((await readBody<{ scoutIds?: number[] }>(event))?.scoutIds || []).map(Number))]
  if (ids.some(x => !allowed.has(x))) throw createError({ statusCode: 403, message: 'Δεν είναι στον τομέα σας' })
  await unregisterResponse([id])
  await registerChildren(ids, f.registrationYear, { formId: f.id, responseId: id })
  await logAccess(f.id, me.id, 'link-children', id)
  return { ok: true }
})
