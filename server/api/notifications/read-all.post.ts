import { and, eq, isNull, notInArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { GAME_KINDS } from '../../../utils/games'

/** All of one's own notifications in the bell read at once (they stay listed);
    the mini-games' own news is left for each game. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  await (await useDb()).update(s.notifications).set({ readAt: now() })
    .where(and(eq(s.notifications.scoutId, me.id), isNull(s.notifications.readAt), notInArray(s.notifications.kind, GAME_KINDS)))
  return { ok: true }
})
