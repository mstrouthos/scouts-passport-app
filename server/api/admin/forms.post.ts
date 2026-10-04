import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'
import { toSlug } from '../../utils/slug'
import { now } from '../../utils/passcode'
import { newId } from '../../../utils/formSpec'

/** A new form, closed until it is ready, with one empty module to start from. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const b = await readBody<{ titleEl?: string }>(event)
  const title = String(b?.titleEl || '').trim().slice(0, 200)
  if (!title) throw createError({ statusCode: 400, message: 'Χρειάζεται τίτλος' })
  const db = await useDb()
  const taken = new Set((await db.select({ slug: s.forms.slug }).from(s.forms)).map(x => x.slug))
  const base = toSlug(title) || 'forma'
  let slug = base
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
  const spec = {
    modules: [{ id: newId(), title: '', questions: [] }],
    ticks: [],
    signature: { enabled: false, required: true, label: '' }
  }
  const [row] = await db.insert(s.forms).values({
    slug, titleEl: title, spec: JSON.stringify(spec), isOpen: false, createdBy: me.id, createdAt: now()
  }).returning()
  return { id: row.id }
})
