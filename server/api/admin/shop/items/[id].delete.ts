import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { requireShopManager, imagesOf } from '../../../../utils/shop'
import { deleteStored } from '../../../../utils/storage'

/** An item taken out of the shop for good, with its pictures. What was sold
    of it stays in the till's book, by name. */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const id = idParam(event)
  const db = await useDb()
  const done = await db.delete(s.shopItems).where(eq(s.shopItems.id, id)).returning()
  if (!done.length) throw createError({ statusCode: 404, message: 'Not found' })
  for (const fileId of imagesOf(done[0]!)) {
    const f = (await db.delete(s.files).where(eq(s.files.id, fileId)).returning())[0]
    if (f) await deleteStored(f.data)
  }
  return { ok: true }
})
