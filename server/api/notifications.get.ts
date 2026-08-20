import { eq, desc } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const rows = useDb().select().from(s.notifications)
    .where(eq(s.notifications.scoutId, me.id))
    .orderBy(desc(s.notifications.createdAt)).limit(60).all()
  return rows.map(n => ({
    id: n.id, kind: n.kind, refId: n.refId, title: n.title, body: n.body,
    createdAt: n.createdAt, read: n.readAt != null
  }))
})
