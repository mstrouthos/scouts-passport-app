import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, sectionOfWith } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { normalizePhone } from '../../utils/phone'

/** Add a parent to a scout. The child is required: a parent is reached through
    their kid, which is what lets an announcement to a group or a section find
    the right families without a second list to maintain. The section follows
    from the child rather than being chosen separately. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ name?: string, email?: string, phone?: string, scoutId?: number }>(event)
  const name = String(b?.name || '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name required' })
  const email = String(b?.email || '').trim() || null
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw createError({ statusCode: 400, message: 'Bad email' })
  const phone = normalizePhone(b?.phone)
  if (!email && !phone)
    throw createError({ statusCode: 400, message: 'Give an email or a phone, so the code can be sent' })

  const db = (await useDb())
  // check before querying: a missing id would reach Postgres as NaN and 500
  const scoutId = Number(b?.scoutId)
  if (!Number.isInteger(scoutId))
    throw createError({ statusCode: 400, message: 'Pick the scout this parent belongs to' })
  const kid = (await db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).limit(1))[0]
  if (!kid) throw createError({ statusCode: 400, message: 'Pick the scout this parent belongs to' })

  const patrols = (await db.select().from(s.patrols))
  const sectionId = sectionOfWith(kid as any, patrols)
  if (sectionId == null) throw createError({ statusCode: 400, message: 'That scout has no sector yet' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  const [row] = (await db.insert(s.parents).values({
    scoutId, sectionId, name, email, phone, addedBy: me.id, createdAt: now()
  }).returning())
  return { id: row.id }
})
