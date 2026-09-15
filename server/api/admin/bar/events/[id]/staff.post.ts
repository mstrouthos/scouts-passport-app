import { useDb, schema as s } from '../../../../../db'
import { requireBarAdmin, newStaffCode } from '../../../../../utils/bar'
import { now } from '../../../../../utils/passcode'

/** Someone on the crew for the night, with a code to sign in by. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<{ name?: string; role?: string; bartenderId?: number }>(event)
  const name = String(b?.name || '').trim()
  const role = ['waiter', 'bartender', 'cashier', 'supervisor'].includes(String(b?.role)) ? b!.role as any : null
  if (!name || !role) throw createError({ statusCode: 400, message: 'Name and role required' })
  const db = await useDb()
  const [row] = await db.insert(s.barStaff).values({
    eventId: id, role, name, code: await newStaffCode(),
    bartenderId: role === 'waiter' && b?.bartenderId ? Number(b.bartenderId) : null,
    isActive: true, createdAt: now()
  }).returning()
  return { id: row.id, code: row.code }
})
