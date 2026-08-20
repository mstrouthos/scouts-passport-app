import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { now } from '../../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const id = idParam(event)
  const db = (await useDb())
  const row = (await db.select().from(s.notifications)
    .where(and(eq(s.notifications.id, id), eq(s.notifications.scoutId, me.id))).limit(1))[0]
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  if (!row.readAt) await db.update(s.notifications).set({ readAt: now() }).where(eq(s.notifications.id, id))
  return { ok: true }
})
