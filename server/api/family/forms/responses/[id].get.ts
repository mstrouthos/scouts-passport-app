import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { requireParent } from '../../../../utils/parentGuard'
import { ownResponse } from '../../../../utils/familyForms'
import { unseal } from '../../../../utils/seal'
import { normalizeSpec } from '../../../../../utils/formSpec'
import { filesOfResponse } from '../../../../utils/formFiles'

/** A parent's own answer, read-only, with the questions as they were. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const r = await ownResponse(p.id, idParam(event))
  const f = (await (await useDb()).select().from(s.forms).where(eq(s.forms.id, r.formId)).limit(1))[0]
  return {
    id: r.id, formId: r.formId, formTitle: f?.titleEl ?? '', createdAt: r.createdAt,
    spec: normalizeSpec(JSON.parse(r.spec)), data: unseal(r.sealed),
    files: Object.fromEntries(Object.entries(await filesOfResponse(r.id))
      .map(([k, x]) => [k, { id: x.id, name: x.name, mime: x.mime, size: x.size }]))
  }
})
