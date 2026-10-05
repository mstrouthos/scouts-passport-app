import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireTroopLeader, idParam } from '../../../../utils/guard'
import { formById, logAccess, specOf } from '../../../../utils/forms'
import { unseal } from '../../../../utils/seal'
import { answerText, repeatGroups, copiesOf, type FieldType, type RepeatGroup } from '../../../../../utils/formSpec'
import { saveFormFile } from '../../../../utils/formFiles'

/** Every answer as a spreadsheet (CSV that Excel opens in Greek). Columns
    follow the form as it is now; a question since removed is still exported,
    at the end, under the wording it had. A form that repeats a run of
    sections (a registration's children) gives one row per copy — per child —
    with the shared answers (the parent's) on every one of its rows. The file is kept, encrypted, with
    the form's other files (in the bucket), and downloaded from there. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  const f = await formById(id)
  const db = await useDb()
  const rows = (await db.select().from(s.formResponses).where(eq(s.formResponses.formId, id)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const spec = specOf(f)
  // the first repeated run sets the rows; any other is spread over columns
  const groups = repeatGroups(spec)
  const main: RepeatGroup | null = groups[0] ?? null
  const groupOf = new Map<string, RepeatGroup>()
  for (const g of groups) for (let j = g.start; j <= g.end; j++) for (const q of spec.modules[j].questions) groupOf.set(q.id, g)
  type Col = { id: string, label: string, kind: 'q' | 't', type?: FieldType, key: (copy: number) => string }
  const cols: Col[] = []
  const names = Object.fromEntries((await db.select().from(s.formFiles).where(eq(s.formFiles.formId, id)))
    .filter(x => x.kind === 'upload' && x.responseId).map(x => [`f:${x.id}`, x.name]))
  const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia' }) : ''
  const parsed = rows.map(r => {
    let data: any = {}, old: any = null
    try { data = unseal(r.sealed); old = JSON.parse(r.spec) } catch {}
    return { r, data, old }
  })
  // the most copies any response has of each other run: that many columns
  const widest = (g: RepeatGroup) => Math.max(1, ...parsed.map(p => copiesOf(g, p.data.repeats)))
  for (const m of spec.modules) for (const q of m.questions) {
    const g = groupOf.get(q.id)
    const label = (m.title ? m.title + ' — ' : '') + q.label
    if (!g) cols.push({ id: q.id, label, kind: 'q', type: q.type, key: () => q.id })
    else if (g === main) cols.push({ id: q.id, label, kind: 'q', type: q.type, key: n => `${q.id}@${n}` })
    else for (let k = 1; k <= widest(g); k++) cols.push({ id: `${q.id}@${k}`, label: `${g.repeat.label} ${k} — ${label}`, kind: 'q', type: q.type, key: () => `${q.id}@${k}` })
  }
  for (const x of spec.ticks) cols.push({ id: x.id, label: x.label, kind: 't', key: () => x.id })
  // questions since removed from the form, under the wording they had
  for (const { old } of parsed) {
    for (const m of old?.modules || []) for (const q of m.questions || [])
      if (!cols.some(c => c.id === q.id)) cols.push({ id: q.id, label: q.label, kind: 'q', type: q.type, key: () => q.id })
    for (const x of old?.ticks || []) if (!cols.some(c => c.id === x.id)) cols.push({ id: x.id, label: x.label, kind: 't', key: () => x.id })
  }
  const cell = (v: string) => /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const lines = [
    ['#', 'Ημερομηνία', ...(main ? [`${main.repeat.label} #`] : []), ...cols.map(c => c.label), ...(spec.signature.enabled ? ['Υπογραφή', 'Υπέγραψε', 'Ημερομηνία υπογραφής'] : [])].map(cell).join(','),
    ...parsed.flatMap(({ r, data }) => {
      const copies = main ? copiesOf(main, data.repeats) : 1
      return Array.from({ length: copies }, (_, i) => i + 1).map(n => [
        String(r.id), when(r.createdAt), ...(main ? [`${n} / ${copies}`] : []),
        ...cols.map(c => c.kind === 'q' ? answerText(data.answers?.[c.key(n)], c.type, names) : (data.ticks?.[c.key(n)] ? '✔' : '')),
        ...(spec.signature.enabled ? [data.signature ? '✔' : '', data.signerName || '', when(data.signedAt)] : [])
      ].map(cell).join(','))
    })
  ]
  const stamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  const file = await saveFormFile({
    formId: id, kind: 'export', name: `${f.slug}-${stamp}.csv`, mime: 'text/csv; charset=utf-8',
    buf: Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8'), createdBy: me.id
  })
  await logAccess(id, me.id, 'export')
  return { fileId: file.id, name: file.name }
})
