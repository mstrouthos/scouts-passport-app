import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'
import { toSlug } from '../../utils/slug'
import { now } from '../../utils/passcode'
import { newId } from '../../../utils/formSpec'
import { specOf } from '../../utils/forms'

/** A new form, closed until it is ready: empty (one module to start from), a
    copy of another form, or made from a template. A copy takes the questions
    and the messages, never the responses or the files. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const b = await readBody<{ titleEl?: string, fromForm?: number, fromTemplate?: number }>(event)
  const title = String(b?.titleEl || '').trim().slice(0, 200)
  if (!title) throw createError({ statusCode: 400, message: 'Χρειάζεται τίτλος' })
  const db = await useDb()

  let base: { spec: string, introEl: string | null, thanksEl: string | null, thanksTitleEl: string | null } | null = null
  if (b?.fromForm) {
    base = (await db.select().from(s.forms).where(eq(s.forms.id, Number(b.fromForm))).limit(1))[0] ?? null
    if (!base) throw createError({ statusCode: 404, message: 'Η φόρμα δεν βρέθηκε' })
  } else if (b?.fromTemplate) {
    base = (await db.select().from(s.formTemplates).where(eq(s.formTemplates.id, Number(b.fromTemplate))).limit(1))[0] ?? null
    if (!base) throw createError({ statusCode: 404, message: 'Το πρότυπο δεν βρέθηκε' })
  }

  const taken = new Set((await db.select({ slug: s.forms.slug }).from(s.forms)).map(x => x.slug))
  const root = toSlug(title) || 'forma'
  let slug = root
  for (let i = 2; taken.has(slug); i++) slug = `${root}-${i}`
  const spec = base
    ? specOf(base)
    : { modules: [{ id: newId(), title: '', questions: [] }], ticks: [], signature: { enabled: false, required: true, label: '' } }
  const [row] = await db.insert(s.forms).values({
    slug, titleEl: title, spec: JSON.stringify(spec), isOpen: false,
    introEl: base?.introEl ?? null, thanksEl: base?.thanksEl ?? null, thanksTitleEl: base?.thanksTitleEl ?? null,
    createdBy: me.id, createdAt: now()
  }).returning()
  return { id: row.id }
})
