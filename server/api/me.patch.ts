import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'
import { normalizePhone } from '../utils/phone'

/** A member correcting their own name and phone number.

    Everyone may, until a leader turns it off for them — the flag is checked
    here rather than only hidden in the UI, so revoking it actually revokes it.
    Nothing else about them is editable this way: not their sector, their unit,
    their role or their passcode. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (!me.canEditSelf)
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
  if (Object.keys(set).length)
    await (await useDb()).update(s.scouts).set(set).where(eq(s.scouts.id, me.id))
  return { ok: true }
})
