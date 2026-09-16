import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { requireBarAdmin } from '../../../../../../utils/bar'

export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const mid = Number(getRouterParam(event, 'mid'))
  const b = await readBody<any>(event)
  const set: any = {}
  if (b?.name !== undefined) set.name = String(b.name).trim()
  if (b?.category !== undefined) set.category = String(b.category).trim()
  if (b?.price !== undefined) set.priceCents = Math.max(0, Math.round(Number(b.price) * 100) || 0)
  if (b?.isActive !== undefined) set.isActive = !!b.isActive
  if (b?.couponOk !== undefined) set.couponOk = !!b.couponOk
  if (b?.couponCost !== undefined) set.couponCost = Math.max(1, Math.floor(Number(b.couponCost)) || 1)
  if (b?.sort !== undefined) set.sort = Number(b.sort) || 0
  const db = await useDb()
  await db.update(s.barMenuItems).set(set).where(eq(s.barMenuItems.id, mid))
  return { ok: true }
})
