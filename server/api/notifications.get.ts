import { and, eq, desc, notInArray } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'
import { linkForNotification } from '../utils/notifyLinks'
import { stillListed } from '../utils/notifyRetention'
import { GAME_KINDS } from '../../utils/games'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const rows = (await (await useDb()).select().from(s.notifications)
    // the mini-games' news waits in each game, not here
    .where(and(eq(s.notifications.scoutId, me.id), notInArray(s.notifications.kind, GAME_KINDS)))
    .orderBy(desc(s.notifications.createdAt)).limit(60))
    // read a day ago or more: gone from the bell, whatever the sweep has done
    .filter(n => stillListed(n) && !n.dismissedAt)
  return rows.map(n => ({
    id: n.id, kind: n.kind, refId: n.refId, title: n.title, body: n.body,
    createdAt: n.createdAt, read: n.readAt != null,
    link: linkForNotification(n.kind, n.refId)
  }))
})
