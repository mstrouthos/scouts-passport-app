import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { requireParent } from '../../../../utils/parentGuard'
import { ownResponse } from '../../../../utils/familyForms'
import { openFormFile, disposition } from '../../../../utils/formFiles'

/** A file the parent uploaded with their own answer — nothing else. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const row = (await (await useDb()).select().from(s.formFiles).where(eq(s.formFiles.id, idParam(event))).limit(1))[0]
  if (!row || row.kind !== 'upload' || !row.responseId) throw createError({ statusCode: 404, message: 'Not found' })
  await ownResponse(p.id, row.responseId)
  setHeader(event, 'content-type', row.mime)
  setHeader(event, 'content-disposition', disposition(row.name, !!getQuery(event).download))
  setHeader(event, 'cache-control', 'private, no-store')
  return await openFormFile(row)
})
