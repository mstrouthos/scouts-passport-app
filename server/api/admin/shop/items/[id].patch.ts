import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { now } from '../../../../utils/passcode'
import { requireShopManager, centsOf } from '../../../../utils/shop'

/** An item changed: its name, description, price, how many are left, or
    whether the Βαθμοφόροι see it. */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const id = idParam(event)
  const b = await readBody<{ name?: string, description?: string | null, price?: string | number, stock?: number | string | null, visible?: boolean }>(event)
  const set: Partial<typeof s.shopItems.$inferInsert> = { updatedAt: now() }
  if (b?.name !== undefined) {
    const name = String(b.name || '').trim().slice(0, 120)
    if (!name) throw createError({ statusCode: 400, message: 'Γράψτε το όνομα του είδους' })
    set.name = name
  }
  if (b?.description !== undefined) set.description = String(b.description || '').trim().slice(0, 500) || null
  if (b?.price !== undefined) {
    const price = centsOf(b.price)
    if (price == null || price < 0 || price > 1_000_000) throw createError({ statusCode: 400, message: 'Γράψτε μια σωστή τιμή' })
    set.priceCents = price
  }
  if (b?.stock !== undefined) set.stock = b.stock === '' || b.stock == null ? null : Math.max(0, Math.round(Number(b.stock))) || 0
  if (typeof b?.visible === 'boolean') set.visible = b.visible
  const done = await (await useDb()).update(s.shopItems).set(set).where(eq(s.shopItems.id, id)).returning()
  if (!done.length) throw createError({ statusCode: 404, message: 'Not found' })
  return { ok: true }
})
