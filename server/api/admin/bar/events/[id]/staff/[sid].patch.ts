import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin, newStaffCode } from '../../../../../../utils/bar'

/** Rename, reassign a waiter to another bartender, hand out a fresh code,
    or take someone off the crew. */
export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const sid = Number(getRouterParam(event, 'sid'))
  const b = await readBody<any>(event)
  const db = await useDb()
  const set: any = {}
  if (b?.name !== undefined) set.name = String(b.name).trim()
  if (b?.bartenderId !== undefined) set.bartenderId = b.bartenderId ? Number(b.bartenderId) : null
  if (b?.isActive !== undefined) set.isActive = !!b.isActive
  if (Array.isArray(b?.accepts)) set.accepts = b.accepts.filter((x: string) => ['cash', 'card', 'coupon'].includes(x)).join(',')
  if (b?.newCode) set.code = await newStaffCode()
  await db.update(s.barStaff).set(set).where(eq(s.barStaff.id, sid))
  // a waiter moved to another bartender takes their open orders along
  if (set.bartenderId !== undefined) {
    const open = (await db.select().from(s.barOrders).where(eq(s.barOrders.waiterId, sid))).filter(o => o.status === 'new')
    for (const o of open) await db.update(s.barOrders).set({ bartenderId: set.bartenderId }).where(eq(s.barOrders.id, o.id))
  }
  return { ok: true, code: set.code }
})
