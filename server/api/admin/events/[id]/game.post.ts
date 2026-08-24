import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedPatrolIds, idParam } from '../../../../utils/guard'
import { assertScoutVisible } from '../../../../utils/requirements'
import { now } from '../../../../utils/passcode'
import { assertCan } from '../../../../utils/permissions'

/** Award points during an event, either to a whole ενωμοτία or to one scout —
    a patrol wins the game, but one scout can earn something on their own. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'points.award')
  const eventId = idParam(event)
  const b = await readBody<{ patrolId?: number, scoutId?: number, points?: number, reasonEl?: string, reasonEn?: string }>(event)
  const points = Number(b?.points)
  const patrolId = b?.patrolId != null ? Number(b.patrolId) : null
  const scoutId = b?.scoutId != null ? Number(b.scoutId) : null

  if (!Number.isInteger(points) || points === 0)
    throw createError({ statusCode: 400, message: 'Points required' })
  if ((patrolId == null) === (scoutId == null))
    throw createError({ statusCode: 400, message: 'Award to either a patrol or a scout, not both' })

  if (patrolId != null) {
    if (!Number.isInteger(patrolId)) throw createError({ statusCode: 400, message: 'Bad patrol' })
    const pids = await scopedPatrolIds(me)
    if (pids !== null && !pids.includes(patrolId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
  } else {
    if (!Number.isInteger(scoutId)) throw createError({ statusCode: 400, message: 'Bad scout' })
    await assertScoutVisible(me, scoutId!)
  }

  const db = (await useDb())
  if (!(await db.select().from(s.events).where(eq(s.events.id, eventId)).limit(1))[0])
    throw createError({ statusCode: 404, message: 'Event not found' })
  await db.insert(s.pointAwards).values({
    patrolId, scoutId, eventId, kind: 'game', points,
    reasonEl: String(b?.reasonEl || 'Παιχνίδι'), reasonEn: b?.reasonEn || null,
    awardedBy: me.id, awardedAt: now()
  })
  return { ok: true }
})
