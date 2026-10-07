import { and, eq, desc, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { stillListed } from '../../../utils/notifyRetention'
import { linkForNotification } from '../../../utils/notifyLinks'
import { isGameKey, kindsOfGame } from '../../../../utils/games'

/** One game's own news, newest first — what the bell no longer shows. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const game = getQuery(event).game
  if (!isGameKey(game)) throw createError({ statusCode: 400, message: 'Bad game' })
  const rows = (await (await useDb()).select().from(s.notifications)
    .where(and(eq(s.notifications.scoutId, me.id), inArray(s.notifications.kind, kindsOfGame(game))))
    .orderBy(desc(s.notifications.createdAt)).limit(40))
    .filter(n => stillListed(n) && !n.dismissedAt)
  return rows.map(n => ({
    id: n.id, kind: n.kind, title: n.title, body: n.body, createdAt: n.createdAt, read: n.readAt != null,
    link: linkForNotification(n.kind, n.refId)
  }))
})
