import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireTroopLeader, idParam } from '../../../../utils/guard'
import { formById, logAccess, specOf } from '../../../../utils/forms'
import { unseal } from '../../../../utils/seal'
import { answerText, type FieldType } from '../../../../../utils/formSpec'

/** Every answer as a spreadsheet (CSV that Excel opens in Greek). Columns
    follow the form as it is now; a question since removed is still exported,
    at the end, under the wording it had. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  const f = await formById(id)
  const db = await useDb()
  const rows = (await db.select().from(s.formResponses).where(eq(s.formResponses.formId, id)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const spec = specOf(f)
  const cols: Array<{ id: string, label: string, kind: 'q' | 't', type?: FieldType }> = [
    ...spec.modules.flatMap(m => m.questions.map(q => ({ id: q.id, label: (m.title ? m.title + ' — ' : '') + q.label, kind: 'q' as const, type: q.type }))),
    ...spec.ticks.map(x => ({ id: x.id, label: x.label, kind: 't' as const }))
  ]
  const parsed = rows.map(r => {
    let data: any = {}, old: any = null
    try { data = unseal(r.sealed); old = JSON.parse(r.spec) } catch {}
    for (const m of old?.modules || []) for (const q of m.questions || [])
      if (!cols.some(c => c.id === q.id)) cols.push({ id: q.id, label: q.label, kind: 'q', type: q.type })
    for (const x of old?.ticks || []) if (!cols.some(c => c.id === x.id)) cols.push({ id: x.id, label: x.label, kind: 't' })
    return { r, data }
  })
  const cell = (v: string) => /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const lines = [
    ['#', 'Ημερομηνία', ...cols.map(c => c.label), ...(spec.signature.enabled ? ['Υπογραφή'] : [])].map(cell).join(','),
    ...parsed.map(({ r, data }) => [
      String(r.id), new Date(r.createdAt).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia' }),
      ...cols.map(c => c.kind === 'q' ? answerText(data.answers?.[c.id], c.type) : (data.ticks?.[c.id] ? '✔' : '')),
      ...(spec.signature.enabled ? [data.signature ? '✔' : ''] : [])
    ].map(cell).join(','))
  ]
  await logAccess(id, me.id, 'export')
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${f.slug}.csv"`)
  setHeader(event, 'cache-control', 'no-store')
  return '﻿' + lines.join('\r\n')
})
