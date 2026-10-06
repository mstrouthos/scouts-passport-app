import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { formForLeader, logAccess } from '../../../../utils/forms'
import { unseal } from '../../../../utils/seal'
import { normalizeSpec, answerText, visibleParts, repeatGroups, copiesOf } from '../../../../../utils/formSpec'

/** A form's answers, newest first, each named by its first few answers so
    the list can be read at a glance. */
export default defineEventHandler(async (event) => {
  const id = idParam(event)
  const { me } = await formForLeader(event, id)
  const db = await useDb()
  const rows = (await db.select().from(s.formResponses).where(eq(s.formResponses.formId, id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  await logAccess(id, me.id, 'list')
  return rows.map(r => {
    let summary: string[] = []
    try {
      const spec = normalizeSpec(JSON.parse(r.spec))
      const data = unseal(r.sealed)
      // the first few answers in the order they were given, then how many
      // children (or whatever the form repeats) the response holds
      const vis = visibleParts(spec, data.answers || {}, data.repeats)
      summary = vis.shown.flatMap(inst => inst.m.questions.map(q => ({ q, key: q.id + inst.sfx })))
        .filter(({ q, key }) => q.type !== 'textarea' && q.type !== 'file' && data.answers?.[key] != null)
        .slice(0, 3).map(({ q, key }) => answerText(data.answers[key], q.type))
      for (const g of repeatGroups(spec)) summary.push(`${copiesOf(g, data.repeats)} × ${g.repeat.label}`)
    } catch { summary = ['⚠️'] }
    return { id: r.id, createdAt: r.createdAt, isRead: r.isRead, summary }
  })
})
