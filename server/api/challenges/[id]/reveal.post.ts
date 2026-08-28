import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { now, isAfter, isAtOrBefore } from '../../../utils/passcode'
import { DECAY_EVERY_MS, MIN_POINTS, MAX_POINTS } from '../../../utils/scoring'
import { isScoutTroop } from '../../../utils/programme'

/** Start the answer clock. Recording the moment here — and only the first time —
    means the countdown survives a reload and cannot be restarted by the client. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (!(await isScoutTroop(me.id)))
    throw createError({ statusCode: 403, message: 'Not your programme' })
  const id = idParam(event)
  const db = await useDb()
  const t = now()

  const c = (await db.select().from(s.challenges).where(eq(s.challenges.id, id)).limit(1))[0]
  if (!c || !c.isPublished || !c.unlocksAt || isAfter(c.unlocksAt, t))
    throw createError({ statusCode: 404, message: 'Challenge not found' })
  if (isAtOrBefore(c.closesAt, t))
    throw createError({ statusCode: 400, message: 'Challenge closed' })

  const prev = (await db.select().from(s.challengeReveals)
    .where(and(eq(s.challengeReveals.challengeId, id), eq(s.challengeReveals.scoutId, me.id))).limit(1))[0]
  if (!prev)
    await db.insert(s.challengeReveals).values({ challengeId: id, scoutId: me.id, revealedAt: t })

  const revealedAt = prev?.revealedAt ?? t
  return {
    revealedAt,
    elapsedMs: Math.max(0, Date.parse(t) - Date.parse(revealedAt)),
    points: MAX_POINTS, minPoints: MIN_POINTS, decayEveryMs: DECAY_EVERY_MS
  }
})
