import { asc } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireShopViewer, trackStock, shopItemView } from '../utils/shop'

/** The shop for a member of a κλάδος it is open to: what it sells, for how
    much, and its pictures. Nothing is bought or ordered here. */
export default defineEventHandler(async (event) => {
  await requireShopViewer(event)
  const db = await useDb()
  const counting = await trackStock()
  const items = (await db.select().from(s.shopItems).orderBy(asc(s.shopItems.sortOrder), asc(s.shopItems.name)))
    .filter(i => i.visible)
    .map(i => { const v = shopItemView(i, counting); return { id: v.id, name: v.name, description: v.description, priceCents: v.priceCents, soldOut: v.stock === 0, images: v.images } })
  return { items }
})
