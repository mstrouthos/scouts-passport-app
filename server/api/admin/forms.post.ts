import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { toSlug } from '../../utils/slug'
import { now } from '../../utils/passcode'
import { newId } from '../../../utils/formSpec'
import { specOf, canManageForm, formSections, isArchigosFor, formApprovers } from '../../utils/forms'
import { sendPushTo } from '../../utils/push'
import { noteError } from '../../utils/errorReport'

/** A new form, closed until it is ready: empty (one module to start from), a
    copy of another form, or made from a template. A copy takes the questions
    and the messages, never the responses or the files. It belongs to a
    sector of the leader's (or the whole troop, for the administrators); one
    made by an Υπαρχηγός waits for the sector's Αρχηγός to approve it. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ titleEl?: string, fromForm?: number, fromTemplate?: number, sectionId?: number | null }>(event)
  const title = String(b?.titleEl || '').trim().slice(0, 200)
  if (!title) throw createError({ statusCode: 400, message: 'Χρειάζεται τίτλος' })
  const db = await useDb()

  let base: { spec: string, introEl: string | null, thanksEl: string | null, thanksTitleEl: string | null } | null = null
  const secs = await formSections(me)
  const sectionId = b?.sectionId ? Number(b.sectionId) : (secs?.length === 1 ? secs[0] : null)
  if (secs !== null && (sectionId == null || !secs.includes(sectionId))) throw createError({ statusCode: 400, message: 'Διαλέξτε τομέα' })
  if (b?.fromForm) {
    const src = (await db.select().from(s.forms).where(eq(s.forms.id, Number(b.fromForm))).limit(1))[0]
    if (!src || !(await canManageForm(me, src))) throw createError({ statusCode: 404, message: 'Η φόρμα δεν βρέθηκε' })
    base = src
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
    sectionId, pendingApproval: !(await isArchigosFor(me, sectionId)),
    createdBy: me.id, createdAt: now()
  }).returning()
  if (row.pendingApproval) {
    try {
      await sendPushTo((await formApprovers(sectionId)).filter(id => id !== me.id), {
        title: '📋 Φόρμα για έγκριση', body: `${title} · ${me.firstName} ${me.lastName}`, kind: 'formApproval', refId: row.id
      })
    } catch (e) { noteError('Φόρμες — αίτημα έγκρισης', e, { form: row.id }) }
  }
  return { id: row.id, pendingApproval: row.pendingApproval }
})
