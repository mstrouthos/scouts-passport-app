import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { now, isAfter, isAtOrBefore } from '../../../utils/passcode'
import { DECAY_EVERY_MS, MIN_POINTS, MAX_POINTS, READ_MS } from '../../../utils/scoring'
import { isScoutTroop } from '../../../utils/programme'

/** Called the moment a question is opened. The first call fixes when its
    options appear — after the reading time — and so when the answer clock
    starts; every later call (a reopen, a reload) gets the same moment back.
    Neither the reading countdown nor the clock can be restarted by the client. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (!(await isScoutTroop(me.id)))
    throw createError({ statusCode: 403, message: 'Not your programme' })
  const id = idParam(event)
  const db = await useDb()
  const t = now()

  const c = (await db.select().from(s.challenges).where(eq(s.challenges.id, id)).limit(1))[0]
  // a draft only for the hidden test accounts; a published one once it unlocks
  if (!c || (c.isPublished ? (!c.unlocksAt || isAfter(c.unlocksAt, t)) : !me.isHidden))
    throw createError({ statusCode: 404, message: 'Challenge not found' })
  if (isAtOrBefore(c.closesAt, t))
    throw createError({ statusCode: 400, message: 'Challenge closed' })

  const prev = (await db.select().from(s.challengeReveals)
    .where(and(eq(s.challengeReveals.challengeId, id), eq(s.challengeReveals.scoutId, me.id))).limit(1))[0]
  const revealedAt = prev?.revealedAt ?? new Date(Date.parse(t) + READ_MS).toISOString()
  if (!prev)
    await db.insert(s.challengeReveals).values({ challengeId: id, scoutId: me.id, revealedAt })

  return {
    revealedAt,
    // how long until the options appear (still reading), or how long since
    // they did (the clock running); one of the two is always 0
    readLeftMs: Math.max(0, Date.parse(revealedAt) - Date.parse(t)),
    elapsedMs: Math.max(0, Date.parse(t) - Date.parse(revealedAt)),
    points: MAX_POINTS, minPoints: MIN_POINTS, decayEveryMs: DECAY_EVERY_MS
  }
})
