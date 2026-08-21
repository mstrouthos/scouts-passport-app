import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { normalizePhone } from '../../utils/phone'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ name?: string, email?: string, phone?: string, sectionId?: number }>(event)
  const name = String(b?.name || '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name required' })
  const email = String(b?.email || '').trim() || null
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw createError({ statusCode: 400, message: 'Bad email' })
  const phone = normalizePhone(b?.phone)
  if (!email && !phone)
    throw createError({ statusCode: 400, message: 'Give an email or a phone, so the code can be sent' })

  const db = (await useDb())
  const sectionId = Number(b?.sectionId)
  if (!(await db.select().from(s.sections)).some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'Bad section' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  const [row] = (await db.insert(s.parents).values({
    sectionId, name, email, phone, addedBy: me.id, createdAt: now()
  }).returning())
  return { id: row.id }
})
