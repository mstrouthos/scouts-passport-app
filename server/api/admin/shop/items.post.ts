import { useDb, schema as s } from '../../../db'
import { now } from '../../../utils/passcode'
import { requireShopManager, centsOf } from '../../../utils/shop'

/** A new item for the shop: its name and price, and if the shop counts them,
    how many there are. */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const b = await readBody<{ name?: string, description?: string, price?: string | number, stock?: number | string | null }>(event)
  const name = String(b?.name || '').trim().slice(0, 120)
  const price = centsOf(b?.price)
  if (!name) throw createError({ statusCode: 400, message: 'Γράψτε το όνομα του είδους' })
  if (price == null || price < 0 || price > 1_000_000) throw createError({ statusCode: 400, message: 'Γράψτε μια σωστή τιμή' })
  const stock = b?.stock === '' || b?.stock == null ? null : Math.max(0, Math.round(Number(b.stock)))
  const db = await useDb()
  const last = (await db.select().from(s.shopItems)).reduce((m, i) => Math.max(m, i.sortOrder), 0)
  const [row] = await db.insert(s.shopItems).values({
    name, description: String(b?.description || '').trim().slice(0, 500) || null, priceCents: price,
    stock: Number.isFinite(stock as number) ? stock : null, sortOrder: last + 1, createdAt: now()
  }).returning()
  return { ok: true, id: row!.id }
})
