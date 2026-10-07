import { requireLeader, idParam } from '../../../../../utils/guard'
import { logAccess, responseAccess } from '../../../../../utils/forms'
import { saveFormFile } from '../../../../../utils/formFiles'
import { buildResponsePdf } from '../../../../../utils/formCopy'

/** A response as a PDF, made now, kept encrypted with the form's files (in
    the bucket), and downloaded from there. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const { r, f, pdf } = await buildResponsePdf(id)
  // whoever may read the answer may take it as a PDF
  if (!f || !(await responseAccess(me, f, id))) throw createError({ statusCode: 404, message: 'Not found' })
  const file = await saveFormFile({
    formId: r.formId, kind: 'export', responseId: null, name: `${f?.slug || 'forma'}-${r.id}.pdf`,
    mime: 'application/pdf', buf: pdf, createdBy: me.id
  })
  await logAccess(r.formId, me.id, 'pdf', id)
  return { fileId: file.id, name: file.name }
})
