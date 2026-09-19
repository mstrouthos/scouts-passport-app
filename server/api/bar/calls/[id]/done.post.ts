import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireBarStaff } from '../../../../utils/bar'
import { now } from '../../../../utils/passcode'

/** "I went." Any crew member may clear a call. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const c = (await db.select().from(s.barCalls).where(eq(s.barCalls.id, id)))[0]
  if (!c || c.eventId !== me.eventId) throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(s.barCalls).set({ handledAt: now(), handledBy: me.id }).where(eq(s.barCalls.id, id))
  return { ok: true }
})
