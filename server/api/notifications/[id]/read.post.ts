import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { now } from '../../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const id = idParam(event)
  const db = useDb()
  const row = db.select().from(s.notifications)
    .where(and(eq(s.notifications.id, id), eq(s.notifications.scoutId, me.id))).get()
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  if (!row.readAt) db.update(s.notifications).set({ readAt: now() }).where(eq(s.notifications.id, id)).run()
  return { ok: true }
})
