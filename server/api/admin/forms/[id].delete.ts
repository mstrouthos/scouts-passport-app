import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireTroopLeader, idParam } from '../../../utils/guard'
import { formById, logAccess } from '../../../utils/forms'
import { deleteFormFiles } from '../../../utils/formFiles'

/** A form goes, and every answer it collected with it. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  await formById(id)
  const db = await useDb()
  await deleteFormFiles(await db.select().from(s.formFiles).where(eq(s.formFiles.formId, id)))
  await db.delete(s.formResponses).where(eq(s.formResponses.formId, id))
  await db.delete(s.forms).where(eq(s.forms.id, id))
  await logAccess(id, me.id, 'delete-form')
  return { ok: true }
})
