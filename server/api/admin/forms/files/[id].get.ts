import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireTroopLeader, idParam } from '../../../../utils/guard'
import { logAccess } from '../../../../utils/forms'
import { openFormFile, disposition } from '../../../../utils/formFiles'

/** A form's file — an upload or an export — decrypted and handed over, to
    administrators only. ?download=1 saves it rather than showing it. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const row = (await db.select().from(s.formFiles).where(eq(s.formFiles.id, id)).limit(1))[0]
  if (!row || (row.kind === 'upload' && !row.responseId)) throw createError({ statusCode: 404, message: 'Not found' })
  const buf = await openFormFile(row)
  await logAccess(row.formId, me.id, row.kind === 'export' ? 'download-export' : 'open-file', row.responseId)
  setHeader(event, 'content-type', row.mime)
  setHeader(event, 'content-disposition', disposition(row.name, !!getQuery(event).download))
  setHeader(event, 'cache-control', 'private, no-store')
  return buf
})
