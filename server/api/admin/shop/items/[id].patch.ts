import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { now } from '../../../../utils/passcode'
import { requireShopManager, centsOf, imagesOf } from '../../../../utils/shop'

/** An item changed: its name, description, price, how many are left,
    whether it is shown, or the order of its pictures (the first its cover). */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const id = idParam(event)
  const b = await readBody<{ name?: string, description?: string | null, price?: string | number, stock?: number | string | null, visible?: boolean, images?: number[] }>(event)
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
  const db = await useDb()
  if (Array.isArray(b?.images)) {
    // only a new order of the pictures it has: adding and removing have their own calls
    const item = (await db.select().from(s.shopItems).where(eq(s.shopItems.id, id)).limit(1))[0]
    const have = item ? imagesOf(item) : []
    const order = b.images.map(Number)
    if (order.length !== have.length || !have.every(x => order.includes(x))) throw createError({ statusCode: 409, message: 'Οι φωτογραφίες άλλαξαν — ανανεώστε' })
    set.images = JSON.stringify(order)
  }
  const done = await db.update(s.shopItems).set(set).where(eq(s.shopItems.id, id)).returning()
  if (!done.length) throw createError({ statusCode: 404, message: 'Not found' })
  return { ok: true }
})
