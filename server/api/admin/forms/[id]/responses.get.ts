import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireTroopLeader, idParam } from '../../../../utils/guard'
import { formById, logAccess } from '../../../../utils/forms'
import { unseal } from '../../../../utils/seal'
import { normalizeSpec, answerText } from '../../../../../utils/formSpec'

/** A form's answers, newest first, each named by its first few answers so
    the list can be read at a glance. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  await formById(id)
  const db = await useDb()
  const rows = (await db.select().from(s.formResponses).where(eq(s.formResponses.formId, id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  await logAccess(id, me.id, 'list')
  return rows.map(r => {
    let summary: string[] = []
    try {
      const spec = normalizeSpec(JSON.parse(r.spec))
      const data = unseal(r.sealed)
      summary = spec.modules.flatMap(m => m.questions)
        .filter(q => q.type !== 'textarea' && data.answers?.[q.id] != null)
        .slice(0, 3).map(q => answerText(data.answers[q.id], q.type))
    } catch { summary = ['⚠️'] }
    return { id: r.id, createdAt: r.createdAt, isRead: r.isRead, summary }
  })
})
