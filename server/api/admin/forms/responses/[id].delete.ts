import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireTroopLeader, idParam } from '../../../../utils/guard'
import { logAccess } from '../../../../utils/forms'
import { deleteFormFiles } from '../../../../utils/formFiles'

export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const r = (await db.select().from(s.formResponses).where(eq(s.formResponses.id, id)).limit(1))[0]
  if (!r) throw createError({ statusCode: 404, message: 'Not found' })
  await deleteFormFiles(await db.select().from(s.formFiles).where(eq(s.formFiles.responseId, id)))
  await db.delete(s.formResponses).where(eq(s.formResponses.id, id))
  await logAccess(r.formId, me.id, 'delete', id)
  return { ok: true }
})
