import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedPatrolIds, idParam } from '../../../../utils/guard'
import { now } from '../../../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const eventId = idParam(event)
  const b = await readBody<{ patrolId?: number, points?: number, reasonEl?: string, reasonEn?: string }>(event)
  const patrolId = Number(b?.patrolId)
  const points = Number(b?.points)
  if (!Number.isInteger(patrolId) || !Number.isInteger(points) || points === 0)
    throw createError({ statusCode: 400, message: 'Patrol and points required' })
  const pids = scopedPatrolIds(me)
  if (pids !== null && !pids.includes(patrolId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const db = useDb()
  if (!db.select().from(s.events).where(eq(s.events.id, eventId)).get())
    throw createError({ statusCode: 404, message: 'Event not found' })
  db.insert(s.pointAwards).values({
    patrolId, eventId, kind: 'game', points,
    reasonEl: String(b?.reasonEl || 'Παιχνίδι'), reasonEn: b?.reasonEn || null,
    awardedBy: me.id, awardedAt: now()
  }).run()
  return { ok: true }
})
