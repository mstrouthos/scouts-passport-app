import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'
import { normalizePhone } from '../utils/phone'

/** Anyone correcting their own details — a λυκόπουλο, a πρόσκοπος, a
    Βαθμοφόρος, the Αρχηγός Συστήματος. One path and one switch, so
    "may correct their own details" means the same thing for everybody.

    Everyone may, until a leader turns it off for them; the flag is checked
    here rather than only hidden in the UI, so revoking it actually revokes it.
    Nothing else about them is editable this way: not their sector, their unit,
    their role, their rank or their passcode — and for a member, not their date
    of birth either, which they can read but only a Βαθμοφόρος may correct. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  // the Αρχηγός Συστήματος is never locked out of their own details: there is
  // nobody above them to hand the permission back
  if (!me.canEditSelf && me.role !== 'troop_leader')
    throw createError({ statusCode: 403, message: 'Ο αρχηγός σου έχει κλειδώσει τα στοιχεία σου' })

  const b = await readBody<any>(event)
  const set: any = {}
  if (b?.firstName !== undefined) {
    const v = String(b.firstName).trim()
    if (!v) throw createError({ statusCode: 400, message: 'Name required' })
    set.firstName = v.slice(0, 60)
  }
  if (b?.lastName !== undefined) {
    const v = String(b.lastName).trim()
    if (!v) throw createError({ statusCode: 400, message: 'Name required' })
    set.lastName = v.slice(0, 60)
  }
  if (b?.firstNameEn !== undefined) set.firstNameEn = String(b.firstNameEn || '').trim().slice(0, 60) || null
  if (b?.lastNameEn !== undefined) set.lastNameEn = String(b.lastNameEn || '').trim().slice(0, 60) || null
  if (b?.phone !== undefined) {
    const v = normalizePhone(b.phone)
    if (b.phone && !v) throw createError({ statusCode: 400, message: 'Bad phone' })
    set.phone = v
  }
  // a Βαθμοφόρος's profile carries these two as well; same rules as the roster
  if (b?.email !== undefined) {
    const v = String(b.email || '').trim() || null
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw createError({ statusCode: 400, message: 'Bad email' })
    set.email = v
  }
  if (b?.birthday !== undefined) {
    // a member reads their date of birth but does not set it: it is register
    // data, and a wrong one is for a Βαθμοφόρος to correct
    if (me.role === 'scout')
      throw createError({ statusCode: 403, message: 'Την ημερομηνία γέννησης τη διορθώνει ο αρχηγός σου' })
    const v = String(b.birthday || '').slice(0, 10) || null
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw createError({ statusCode: 400, message: 'Bad date' })
    set.birthday = v
  }
  if (Object.keys(set).length)
    await (await useDb()).update(s.scouts).set(set).where(eq(s.scouts.id, me.id))
  return { ok: true }
})
