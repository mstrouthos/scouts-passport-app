import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireTroopLeader, idParam } from '../../../../utils/guard'
import { formById, logAccess, specOf } from '../../../../utils/forms'
import { unseal } from '../../../../utils/seal'
import { answerText, type FieldType } from '../../../../../utils/formSpec'
import { saveFormFile } from '../../../../utils/formFiles'

/** Every answer as a spreadsheet (CSV that Excel opens in Greek). Columns
    follow the form as it is now; a question since removed is still exported,
    at the end, under the wording it had. The file is kept, encrypted, with
    the form's other files (in the bucket), and downloaded from there. */
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
  const names = Object.fromEntries((await db.select().from(s.formFiles).where(eq(s.formFiles.formId, id)))
    .filter(x => x.kind === 'upload' && x.responseId).map(x => [`f:${x.id}`, x.name]))
  const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia' }) : ''
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
    ['#', 'Ημερομηνία', ...cols.map(c => c.label), ...(spec.signature.enabled ? ['Υπογραφή', 'Υπέγραψε', 'Ημερομηνία υπογραφής'] : [])].map(cell).join(','),
    ...parsed.map(({ r, data }) => [
      String(r.id), when(r.createdAt),
      ...cols.map(c => c.kind === 'q' ? answerText(data.answers?.[c.id], c.type, names) : (data.ticks?.[c.id] ? '✔' : '')),
      ...(spec.signature.enabled ? [data.signature ? '✔' : '', data.signerName || '', when(data.signedAt)] : [])
    ].map(cell).join(','))
  ]
  const stamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  const file = await saveFormFile({
    formId: id, kind: 'export', name: `${f.slug}-${stamp}.csv`, mime: 'text/csv; charset=utf-8',
    buf: Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8'), createdBy: me.id
  })
  await logAccess(id, me.id, 'export')
  return { fileId: file.id, name: file.name }
})
