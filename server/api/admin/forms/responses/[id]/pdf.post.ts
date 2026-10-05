import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { requireTroopLeader, idParam } from '../../../../../utils/guard'
import { logAccess } from '../../../../../utils/forms'
import { unseal } from '../../../../../utils/seal'
import { filesOfResponse, openFormFile, saveFormFile } from '../../../../../utils/formFiles'
import { responsePdf } from '../../../../../utils/formPdf'
import { normalizeSpec } from '../../../../../../utils/formSpec'

/** A response as a PDF, made now, kept encrypted with the form's files (in
    the bucket), and downloaded from there. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const r = (await db.select().from(s.formResponses).where(eq(s.formResponses.id, id)).limit(1))[0]
  if (!r) throw createError({ statusCode: 404, message: 'Not found' })
  const f = (await db.select().from(s.forms).where(eq(s.forms.id, r.formId)).limit(1))[0]
  const rows = await filesOfResponse(id)
  const files: Record<string, any> = {}
  for (const [k, row] of Object.entries(rows)) {
    try { files[k] = { row, bytes: await openFormFile(row) } } catch (e) { console.warn('[forms] file unreadable', row.id, e) }
  }
  const pdf = await responsePdf({
    formTitle: f?.titleEl ?? 'Φόρμα', responseId: r.id, createdAt: r.createdAt,
    spec: normalizeSpec(JSON.parse(r.spec)), data: unseal(r.sealed), files
  })
  const file = await saveFormFile({
    formId: r.formId, kind: 'export', responseId: null, name: `${f?.slug || 'forma'}-${r.id}.pdf`,
    mime: 'application/pdf', buf: Buffer.from(pdf), createdBy: me.id
  })
  await logAccess(r.formId, me.id, 'pdf', id)
  return { fileId: file.id, name: file.name }
})
