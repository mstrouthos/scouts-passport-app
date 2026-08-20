import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../../utils/guard'
import { now } from '../../../../utils/passcode'

const ATTEND_POINTS = 5
const UNIFORM_POINTS = 5

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const eventId = idParam(event)
  const b = await readBody<{ scoutId?: number, attendance?: string | null, uniform?: string | null }>(event)
  const scoutId = Number(b?.scoutId)
  await assertScoutInScope(me, scoutId)
  const db = (await useDb())
  if (!(await db.select().from(s.events).where(eq(s.events.id, eventId)).limit(1))[0])
    throw createError({ statusCode: 404, message: 'Event not found' })

  const attendance = ['present', 'absent', 'excused'].includes(b?.attendance as any) ? b!.attendance as any : null
  const uniform = attendance === 'present' && ['full', 'partial', 'none'].includes(b?.uniform as any) ? b!.uniform as any : null
  const t = now()

  const existing = (await db.select().from(s.eventReviews)
    .where(and(eq(s.eventReviews.eventId, eventId), eq(s.eventReviews.scoutId, scoutId))).limit(1))[0]
  if (existing) {
    await db.update(s.eventReviews).set({ attendance, uniform, recordedBy: me.id, recordedAt: t })
      .where(eq(s.eventReviews.id, existing.id))
  } else {
    await db.insert(s.eventReviews).values({ eventId, scoutId, attendance, uniform, recordedBy: me.id, recordedAt: t })
  }

  // reconcile the automatic points for this scout+event
  const auto = (await db.select().from(s.pointAwards).where(eq(s.pointAwards.eventId, eventId)))
    .filter(a => a.scoutId === scoutId && (a.kind === 'attendance' || a.kind === 'uniform'))
  for (const a of auto) await db.delete(s.pointAwards).where(eq(s.pointAwards.id, a.id))
  if (attendance === 'present' && ATTEND_POINTS)
    await db.insert(s.pointAwards).values({ scoutId, eventId, kind: 'attendance', points: ATTEND_POINTS, reasonEl: 'Παρουσία', reasonEn: 'Attendance', awardedBy: me.id, awardedAt: t })
  if (uniform === 'full' && UNIFORM_POINTS)
    await db.insert(s.pointAwards).values({ scoutId, eventId, kind: 'uniform', points: UNIFORM_POINTS, reasonEl: 'Πλήρης στολή', reasonEn: 'Full uniform', awardedBy: me.id, awardedAt: t })
  return { ok: true }
})
