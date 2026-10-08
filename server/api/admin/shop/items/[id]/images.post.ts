import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { idParam } from '../../../../../utils/guard'
import { now } from '../../../../../utils/passcode'
import { storeFile } from '../../../../../utils/storage'
import { requireShopManager, imagesOf, shopImageUrl, SHOP_MAX_IMAGES } from '../../../../../utils/shop'

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX = 5 * 1024 * 1024   // the phone shrinks it first; this is only a guard

/** A picture of an item, added after the ones it has (the first is its cover). */
export default defineEventHandler(async (event) => {
  const me = await requireShopManager(event)
  const id = idParam(event)
  const b = await readBody<{ name?: string, mime?: string, dataBase64?: string }>(event)
  const db = await useDb()
  const item = (await db.select().from(s.shopItems).where(eq(s.shopItems.id, id)).limit(1))[0]
  if (!item) throw createError({ statusCode: 404, message: 'Not found' })
  const have = imagesOf(item)
  if (have.length >= SHOP_MAX_IMAGES) throw createError({ statusCode: 400, message: `Έως ${SHOP_MAX_IMAGES} φωτογραφίες ανά είδος` })
  const mime = String(b?.mime || '')
  if (!TYPES.has(mime)) throw createError({ statusCode: 400, message: 'Μόνο εικόνες (JPG, PNG, WebP)' })
  const buf = Buffer.from(String(b?.dataBase64 || ''), 'base64')
  if (!buf.length) throw createError({ statusCode: 400, message: 'Άδειο αρχείο' })
  if (buf.length > MAX) throw createError({ statusCode: 400, message: 'Η εικόνα είναι μεγαλύτερη από 5 MB' })
  const name = String(b?.name || 'item').replace(/\.[^.]+$/, '').slice(0, 100) + (mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : '.webp')
  const [f] = await db.insert(s.files).values({
    name, mime, size: buf.length, data: await storeFile(buf, mime, name, 'shop'), uploadedBy: me.id, createdAt: now()
  }).returning()
  await db.update(s.shopItems).set({ images: JSON.stringify([...have, f!.id]), updatedAt: now() }).where(eq(s.shopItems.id, id))
  return { id: f!.id, url: shopImageUrl(f!.id) }
})
