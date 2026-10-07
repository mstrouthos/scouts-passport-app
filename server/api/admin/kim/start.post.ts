import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay, kimTray, KIM_VIEW_MS } from '../../../../utils/kim'

/** The cloth comes off today's tray: the clock starts, once. Opening it again
    the same day gives back the same tray and the same start — a second look
    does not reset the clock. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const day = kimDay()
  await db.insert(s.kimPlays).values({ scoutId: me.id, day, startedAt: now() }).onConflictDoNothing()
  const play = (await db.select().from(s.kimPlays)).find(p => p.scoutId === me.id && p.day === day)!
  if (play.answeredAt) throw createError({ statusCode: 409, message: 'Το σημερινό ταψί το έπαιξες ήδη — ξανά αύριο! 🧠' })
  return { startedAt: play.startedAt, viewMs: KIM_VIEW_MS, ...kimTray(day) }
})
