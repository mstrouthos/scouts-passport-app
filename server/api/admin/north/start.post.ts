import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay } from '../../../../utils/kim'

/** Today's go begins: once a day. The page asks only once the phone's compass
    is answering, so a phone with none never uses up the day. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const day = kimDay()
  const fresh = await db.insert(s.northPlays).values({ scoutId: me.id, day, startedAt: now() }).onConflictDoNothing().returning()
  if (!fresh.length) throw createError({ statusCode: 409, message: 'Τον σημερινό Βορρά τον έψαξες ήδη — ξανά αύριο! 🧭' })
  return { ok: true }
})
