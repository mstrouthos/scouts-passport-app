import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'
import { now } from '../../utils/passcode'

/** All of one's own notifications read at once (they stay in the bell). */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  await (await useDb()).update(s.notifications).set({ readAt: now() })
    .where(and(eq(s.notifications.scoutId, me.id), isNull(s.notifications.readAt)))
  return { ok: true }
})
