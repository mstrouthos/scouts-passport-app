import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { formForLeader } from '../../../../utils/forms'
import { logAccess } from '../../../../utils/forms'
import { deleteFormFiles } from '../../../../utils/formFiles'
import { unregisterResponse } from '../../../../utils/registrations'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const r = (await db.select().from(s.formResponses).where(eq(s.formResponses.id, id)).limit(1))[0]
  if (!r) throw createError({ statusCode: 404, message: 'Not found' })
  await formForLeader(event, r.formId)
  await deleteFormFiles(await db.select().from(s.formFiles).where(eq(s.formFiles.responseId, id)))
  await unregisterResponse([id])
  await db.delete(s.formResponses).where(eq(s.formResponses.id, id))
  await logAccess(r.formId, me.id, 'delete', id)
  return { ok: true }
})
