import { eq, desc } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'

/** The signed-in parent's recent notifications, newest first. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const rows = await (await useDb()).select().from(s.parentNotifications)
    .where(eq(s.parentNotifications.parentId, p.id))
    .orderBy(desc(s.parentNotifications.createdAt)).limit(60)
  return rows.map(n => ({
    id: n.id, kind: n.kind, refId: n.refId, title: n.title, body: n.body,
    createdAt: n.createdAt, read: n.readAt != null
  }))
})
