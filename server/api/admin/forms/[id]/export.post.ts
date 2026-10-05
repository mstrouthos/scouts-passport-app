import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireTroopLeader, idParam } from '../../../../utils/guard'
import { formById, logAccess, specOf } from '../../../../utils/forms'
import { unseal } from '../../../../utils/seal'
import { answerText, repeatGroups, copiesOf, type FieldType, type RepeatGroup } from '../../../../../utils/formSpec'
import { saveFormFile } from '../../../../utils/formFiles'
import { xlsx } from '../../../../utils/xlsx'

/** Every answer as an Excel workbook: one column per question, in the
    form's order as it is now (a question since removed is still exported, at
    the end, under the wording it had). A form that repeats sections (a
    registration's children) gives one row per child — the second child's
    answers from every repeated run on the second row — with the shared
    answers (the parent's) on each of them. The file is kept, encrypted, with
    the form's other files (in the bucket), and downloaded from there. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const id = idParam(event)
  const f = await formById(id)
  const db = await useDb()
  const rows = (await db.select().from(s.formResponses).where(eq(s.formResponses.formId, id)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const spec = specOf(f)
  // every repeated run is per child: copy n of each is on row n
  const groups = repeatGroups(spec)
  const groupOf = new Map<string, RepeatGroup>()
  for (const g of groups) for (let j = g.start; j <= g.end; j++) for (const q of spec.modules[j].questions) groupOf.set(q.id, g)
  type Col = { id: string, label: string, kind: 'q' | 't', type?: FieldType, group?: RepeatGroup, key: (copy: number) => string }
  const cols: Col[] = []
  const names = Object.fromEntries((await db.select().from(s.formFiles).where(eq(s.formFiles.formId, id)))
    .filter(x => x.kind === 'upload' && x.responseId).map(x => [`f:${x.id}`, x.name]))
  const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia' }) : ''
  const parsed = rows.map(r => {
    let data: any = {}, old: any = null
    try { data = unseal(r.sealed); old = JSON.parse(r.spec) } catch {}
    return { r, data, old }
  })
  // headed by the question's number, as in the builder (2.3), and its wording
  spec.modules.forEach((m, mi) => m.questions.forEach((q, qi) => {
    const g = groupOf.get(q.id)
    const label = `${mi + 1}.${qi + 1} ${q.label}`
    cols.push({ id: q.id, label, kind: 'q', type: q.type, group: g, key: n => g ? `${q.id}@${n}` : q.id })
  }))
  for (const x of spec.ticks) cols.push({ id: x.id, label: x.label, kind: 't', key: () => x.id })
  // questions since removed from the form, under the wording they had
  for (const { old } of parsed) {
    for (const m of old?.modules || []) for (const q of m.questions || [])
      if (!cols.some(c => c.id === q.id)) cols.push({ id: q.id, label: q.label, kind: 'q', type: q.type, key: () => q.id })
    for (const x of old?.ticks || []) if (!cols.some(c => c.id === x.id)) cols.push({ id: x.id, label: x.label, kind: 't', key: () => x.id })
  }
  const label = groups[0]?.repeat.label || ''
  const table: string[][] = [
    ['#', 'Ημερομηνία', ...(groups.length ? [`${label} #`] : []), ...cols.map(c => c.label), ...(spec.signature.enabled ? ['Υπογραφή', 'Υπέγραψε', 'Ημερομηνία υπογραφής'] : [])],
    ...parsed.flatMap(({ r, data }) => {
      // as many rows as the response has children in its longest run
      const copies = Math.max(1, ...groups.map(g => copiesOf(g, data.repeats)))
      return Array.from({ length: copies }, (_, i) => i + 1).map(n => [
        String(r.id), when(r.createdAt), ...(groups.length ? [`${n} / ${copies}`] : []),
        ...cols.map(c => {
          if (c.kind === 't') return data.ticks?.[c.key(n)] ? '✔' : ''
          if (c.group && n > copiesOf(c.group, data.repeats)) return ''
          return answerText(data.answers?.[c.key(n)], c.type, names)
        }),
        ...(spec.signature.enabled ? [data.signature ? '✔' : '', data.signerName || '', when(data.signedAt)] : [])
      ])
    })
  ]
  const stamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  const file = await saveFormFile({
    formId: id, kind: 'export', name: `${f.slug}-${stamp}.xlsx`,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buf: xlsx(table), createdBy: me.id
  })
  await logAccess(id, me.id, 'export')
  return { fileId: file.id, name: file.name }
})
