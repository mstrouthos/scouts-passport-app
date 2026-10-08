import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { requireShopManager } from '../../../../utils/shop'

/** An item taken out of the shop for good. What was sold of it stays in the
    till's book, by name. */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const id = idParam(event)
  const done = await (await useDb()).delete(s.shopItems).where(eq(s.shopItems.id, id)).returning()
  if (!done.length) throw createError({ statusCode: 404, message: 'Not found' })
  return { ok: true }
})
