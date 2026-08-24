import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../../utils/guard'
import { now } from '../../../../utils/passcode'
import { getPointRules } from '../../../../utils/settings'
import { assertCan } from '../../../../utils/permissions'
import { canScheduleForGroup, groupMemberIds } from '../../../../utils/groupScope'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'attendance.record')
  const eventId = idParam(event)
  const b = await readBody<{ scoutId?: number, attendance?: string | null, uniform?: string | null }>(event)
  const scoutId = Number(b?.scoutId)
  const db = (await useDb())
  const ev = (await db.select().from(s.events).where(eq(s.events.id, eventId)).limit(1))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Event not found' })
  // a group's meeting is registered by whoever runs the group, for its members
  const viaGroup = ev.scope === 'group' && ev.groupId != null
    && (await groupMemberIds(ev.groupId)).includes(scoutId)
    && await canScheduleForGroup(me, ev.groupId)
  if (!viaGroup) await assertScoutInScope(me, scoutId)
  if (!ev.tracksAttendance)
    throw createError({ statusCode: 400, message: 'This event does not track attendance' })

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
  // point values are configured troop-wide; absence may be worth 0 or negative
  const rules = await getPointRules()
  const attendPoints =
    attendance === 'present' ? rules.present :
    attendance === 'excused' ? rules.excused :
    attendance === 'absent'  ? rules.absent  : 0
  const attendReason =
    attendance === 'present' ? ['Παρουσία', 'Attendance'] :
    attendance === 'excused' ? ['Δικαιολογημένη απουσία', 'Excused absence'] :
                               ['Απουσία', 'Absence']
  if (attendance && attendPoints)
    await db.insert(s.pointAwards).values({ scoutId, eventId, kind: 'attendance', points: attendPoints, reasonEl: attendReason[0], reasonEn: attendReason[1], awardedBy: me.id, awardedAt: t })
  // every uniform verdict can carry points, including a penalty for none
  const uniformPts = uniform === 'full' ? rules.uniformFull
    : uniform === 'partial' ? rules.uniformPartial
    : uniform === 'none' ? rules.uniformNone : 0
  const uniformLabel = uniform === 'full' ? ['Πλήρης στολή', 'Full uniform']
    : uniform === 'partial' ? ['Ελλιπής στολή', 'Partial uniform']
    : ['Χωρίς στολή', 'No uniform']
  if (uniform && uniformPts)
    await db.insert(s.pointAwards).values({ scoutId, eventId, kind: 'uniform', points: uniformPts, reasonEl: uniformLabel[0], reasonEn: uniformLabel[1], awardedBy: me.id, awardedAt: t })
  return { ok: true }
})
