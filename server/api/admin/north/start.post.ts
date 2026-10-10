import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay } from '../../../../utils/kim'
import { northTarget } from '../../../../utils/north'

/** Today's go begins: once a day — and only now is the bearing told, so
    nobody can line up a compass before the 3-2-1. The page asks only once the
    phone's compass is answering, so a phone with none never uses up the day. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const day = kimDay()
  const fresh = await db.insert(s.northPlays).values({ scoutId: me.id, day, startedAt: now() }).onConflictDoNothing().returning()
  if (!fresh.length) throw createError({ statusCode: 409, message: 'Τις σημερινές μοίρες τις έψαξες ήδη — ξανά αύριο! 🧭' })
  return { ok: true, target: northTarget(day, me.id) }
})
