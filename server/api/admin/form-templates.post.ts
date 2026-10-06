import { useDb, schema as s } from '../../db'
import { formForLeader } from '../../utils/forms'
import { now } from '../../utils/passcode'

/** A form's design kept as a template, as it is saved now. */
export default defineEventHandler(async (event) => {
  const b = await readBody<{ formId?: number, name?: string }>(event)
  const { me, f } = await formForLeader(event, Number(b?.formId))
  const name = String(b?.name || '').trim().slice(0, 200) || f.titleEl
  const db = await useDb()
  const [row] = await db.insert(s.formTemplates).values({
    name, spec: f.spec, introEl: f.introEl, thanksEl: f.thanksEl, thanksTitleEl: f.thanksTitleEl,
    createdBy: me.id, createdAt: now()
  }).returning({ id: s.formTemplates.id })
  return { id: row.id }
})
