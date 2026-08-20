import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const body = await readBody<{ locale?: string }>(event)
  if (body?.locale && ['el', 'en'].includes(body.locale)) {
    await (await useDb()).update(s.scouts).set({ locale: body.locale }).where(eq(s.scouts.id, me.id))
  }
  return { ok: true }
})
