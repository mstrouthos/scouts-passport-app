import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireParent } from '../../../utils/parentGuard'
import { now } from '../../../utils/passcode'

/** Mark one of the parent's own notifications read. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad id' })
  const db = (await useDb())
  const row = (await db.select().from(s.parentNotifications)
    .where(and(eq(s.parentNotifications.id, id), eq(s.parentNotifications.parentId, p.id))).limit(1))[0]
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  if (!row.readAt) await db.update(s.parentNotifications).set({ readAt: now() }).where(eq(s.parentNotifications.id, id))
  return { ok: true }
})
