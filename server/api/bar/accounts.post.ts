import { useDb, schema as s } from '../../db'
import { requireBarStaff, acceptsOf } from '../../utils/bar'
import { now } from '../../utils/passcode'

/** The card cashier adds an account the money can land in. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event, ['cashier'])
  if (!acceptsOf(me).includes('card')) throw createError({ statusCode: 403, message: 'Card cashier only' })
  const b = await readBody<{ name?: string }>(event)
  const name = String(b?.name || '').trim().slice(0, 60)
  if (!name) throw createError({ statusCode: 400, message: 'Name required' })
  const db = await useDb()
  const [row] = await db.insert(s.barAccounts).values({ eventId: me.eventId, name, isActive: true, createdAt: now() }).returning()
  return { id: row.id, name: row.name }
})
