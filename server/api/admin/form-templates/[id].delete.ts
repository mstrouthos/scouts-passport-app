import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'

/** A template no longer wanted. Forms made from it keep their own copy. */
export default defineEventHandler(async (event) => {
  await requireLeader(event)
  const db = await useDb()
  await db.delete(s.formTemplates).where(eq(s.formTemplates.id, idParam(event)))
  return { ok: true }
})
