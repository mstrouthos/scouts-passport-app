import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireParent } from '../../../utils/parentGuard'
import { now } from '../../../utils/passcode'

/** All of the parent's own notifications read at once (they stay in the bell). */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  await (await useDb()).update(s.parentNotifications).set({ readAt: now() })
    .where(and(eq(s.parentNotifications.parentId, p.id), isNull(s.parentNotifications.readAt)))
  return { ok: true }
})
