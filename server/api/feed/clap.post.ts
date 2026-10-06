import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'
import { feedFor } from '../../utils/patrolFeed'
import { now } from '../../utils/passcode'

/** A 👏 for a win in the member's own feed — once each, never their own. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const key = String((await readBody<{ key?: string }>(event))?.key || '')
  const item = (await feedFor(me)).find(i => i.key === key)
  if (!item || item.mine) throw createError({ statusCode: 400, message: 'Not in your feed' })
  // a hidden test account tries things out without a real member hearing of it
  if (me.isHidden && item.who.id !== me.id)
    throw createError({ statusCode: 403, message: 'Οι δοκιμαστικοί λογαριασμοί δεν χειροκροτούν πραγματικά μέλη' })
  await (await useDb()).insert(s.scoutKudos).values({ fromId: me.id, toId: item.who.id, eventKey: key, createdAt: now() }).onConflictDoNothing()
  return { ok: true, claps: item.clapped ? item.claps : item.claps + 1 }
})
