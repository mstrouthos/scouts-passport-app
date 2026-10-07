import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { idParam } from '../../../utils/guard'
import { formForLeader, formSections, isArchigosFor } from '../../../utils/forms'
import { toSlug } from '../../../utils/slug'
import { now } from '../../../utils/passcode'
import { normalizeSpec } from '../../../../utils/formSpec'
import { isScoutYear } from '../../../../utils/scoutYear'

/** Save a form: its texts, its link, whether it is open, and its questions.
    Answers already sent keep the questions they answered. */
export default defineEventHandler(async (event) => {
  const id = idParam(event)
  const { me, f } = await formForLeader(event, id)
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
  if (b?.sectionId !== undefined) {
    // only to a sector of their own; the whole troop is the administrators'
    const sec = b.sectionId ? Number(b.sectionId) : null
    const secs = await formSections(me)
    if (secs !== null && (sec == null || !secs.includes(sec))) throw createError({ statusCode: 403, message: 'Δεν είναι στον τομέα σας' })
    set.sectionId = sec
    // moved to a sector this leader is not Αρχηγός of: it waits again
    if (!f.pendingApproval && !(await isArchigosFor(me, sec))) set.pendingApproval = true
  }
  if (b?.isOpen !== undefined) {
    if (b.isOpen && (set.pendingApproval ?? f.pendingApproval)) throw createError({ statusCode: 400, message: 'Η φόρμα περιμένει έγκριση από τον Αρχηγό' })
    set.isOpen = !!b.isOpen
  }
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
  // the year's registration: one form a year does it
  if (b?.registrationYear !== undefined) {
    const year = b.registrationYear ? String(b.registrationYear) : null
    if (year && !isScoutYear(year)) throw createError({ statusCode: 400, message: 'Μη έγκυρη χρονιά' })
    if (year) {
      const other = (await db.select().from(s.forms).where(eq(s.forms.registrationYear, year))).find(x => x.id !== id)
      if (other) throw createError({ statusCode: 409, message: `Η εγγραφή ${year.replace('-', '–')} γίνεται ήδη με τη φόρμα «${other.titleEl}»` })
    }
    set.registrationYear = year
  }
  await db.update(s.forms).set(set).where(eq(s.forms.id, id))
  return { ok: true, slug: set.slug }
})
