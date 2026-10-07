import { and, eq, inArray, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { isGameKey, kindsOfGame } from '../../../../utils/games'

/** A game's news, seen: all of it read (it stays listed for a day). */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const game = (await readBody<{ game?: string }>(event))?.game
  if (!isGameKey(game)) throw createError({ statusCode: 400, message: 'Bad game' })
  await (await useDb()).update(s.notifications).set({ readAt: now() }).where(and(
    eq(s.notifications.scoutId, me.id), inArray(s.notifications.kind, kindsOfGame(game)), isNull(s.notifications.readAt)))
  return { ok: true }
})
