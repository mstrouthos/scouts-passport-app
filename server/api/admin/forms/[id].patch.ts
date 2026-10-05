import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireTroopLeader, idParam } from '../../../utils/guard'
import { formById } from '../../../utils/forms'
import { toSlug } from '../../../utils/slug'
import { now } from '../../../utils/passcode'
import { normalizeSpec } from '../../../../utils/formSpec'

/** Save a form: its texts, its link, whether it is open, and its questions.
    Answers already sent keep the questions they answered. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const id = idParam(event)
  await formById(id)
  const b = await readBody<any>(event)
  const db = await useDb()
  const set: Record<string, any> = { updatedAt: now() }
  if (b?.titleEl !== undefined) {
    const t = String(b.titleEl).trim().slice(0, 200)
    if (!t) throw createError({ statusCode: 400, message: 'Χρειάζεται τίτλος' })
    set.titleEl = t
  }
  if (b?.introEl !== undefined) set.introEl = String(b.introEl || '').slice(0, 5000) || null
  if (b?.thanksEl !== undefined) set.thanksEl = String(b.thanksEl || '').slice(0, 2000) || null
  if (b?.thanksTitleEl !== undefined) set.thanksTitleEl = String(b.thanksTitleEl || '').trim().slice(0, 200) || null
  if (b?.isOpen !== undefined) set.isOpen = !!b.isOpen
  if (b?.closesAt !== undefined) {
    const d = b.closesAt ? new Date(String(b.closesAt)) : null
    if (d && Number.isNaN(d.getTime())) throw createError({ statusCode: 400, message: 'Μη έγκυρη ημερομηνία' })
    set.closesAt = d ? d.toISOString() : null
  }
  if (b?.slug !== undefined) {
    const slug = toSlug(String(b.slug))
    if (!slug) throw createError({ statusCode: 400, message: 'Μη έγκυρος σύνδεσμος' })
    const other = (await db.select().from(s.forms).where(eq(s.forms.slug, slug)).limit(1))[0]
    if (other && other.id !== id) throw createError({ statusCode: 409, message: 'Ο σύνδεσμος χρησιμοποιείται ήδη' })
    set.slug = slug
  }
  if (b?.spec !== undefined) set.spec = JSON.stringify(normalizeSpec(b.spec))
  await db.update(s.forms).set(set).where(eq(s.forms.id, id))
  return { ok: true, slug: set.slug }
})
