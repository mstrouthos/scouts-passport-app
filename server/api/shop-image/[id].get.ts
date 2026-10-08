import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { idParam } from '../../utils/guard'
import { requireShopViewer, isShopManager, imagesOf } from '../../utils/shop'
import { isS3Ref, signedReadUrl } from '../../utils/storage'

/** A picture of an item in the shop, for whoever may see the shop — and only
    a picture an item shows (of a hidden item, only to whoever runs the
    shop), so this is no back door to other stored files. */
export default defineEventHandler(async (event) => {
  const me = await requireShopViewer(event)
  const id = idParam(event)
  const db = await useDb()
  const items = await db.select().from(s.shopItems)
  if (!items.some(i => (i.visible || isShopManager(me)) && imagesOf(i).includes(id))) throw createError({ statusCode: 404, message: 'Not found' })
  const f = (await db.select().from(s.files).where(eq(s.files.id, id)).limit(1))[0]
  if (!f || !f.mime.startsWith('image/')) throw createError({ statusCode: 404, message: 'Not found' })
  if (isS3Ref(f.data)) return sendRedirect(event, await signedReadUrl(f.data, f.name, false), 302)
  setResponseHeader(event, 'Content-Type', f.mime)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
  return Buffer.from(f.data, 'base64')
})
