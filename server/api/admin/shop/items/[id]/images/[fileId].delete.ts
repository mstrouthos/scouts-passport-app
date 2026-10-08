import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../../db'
import { idParam } from '../../../../../../utils/guard'
import { now } from '../../../../../../utils/passcode'
import { deleteStored } from '../../../../../../utils/storage'
import { requireShopManager, imagesOf } from '../../../../../../utils/shop'

/** A picture taken off an item, and the stored file with it. */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const id = idParam(event)
  const fileId = Number(getRouterParam(event, 'fileId'))
  const db = await useDb()
  const item = (await db.select().from(s.shopItems).where(eq(s.shopItems.id, id)).limit(1))[0]
  if (!item || !imagesOf(item).includes(fileId)) throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(s.shopItems).set({ images: JSON.stringify(imagesOf(item).filter(x => x !== fileId)), updatedAt: now() }).where(eq(s.shopItems.id, id))
  const f = (await db.delete(s.files).where(eq(s.files.id, fileId)).returning())[0]
  if (f) await deleteStored(f.data)
  return { ok: true }
})
