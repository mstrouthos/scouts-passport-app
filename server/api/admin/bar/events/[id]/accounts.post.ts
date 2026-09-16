import { useDb, schema as s } from '../../../../../db'
import { requireBarAdmin } from '../../../../../utils/bar'
import { now } from '../../../../../utils/passcode'

export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<{ name?: string }>(event)
  const name = String(b?.name || '').trim().slice(0, 60)
  if (!name) throw createError({ statusCode: 400, message: 'Name required' })
  const db = await useDb()
  const [row] = await db.insert(s.barAccounts).values({ eventId: id, name, isActive: true, createdAt: now() }).returning()
  return { id: row.id }
})
