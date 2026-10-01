import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam } from '../../../../utils/guard'
import { assertCan } from '../../../../utils/permissions'

/** Take back a πτυχίο awarded by mistake — whoever may award it, for a scout
    in their own section. ?scoutId= names the scout. It leaves the scout's
    passport, and its notification leaves their bell; nothing is sent to them. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'badges.award')
  const badgeId = idParam(event)
  const scoutId = Number(getQuery(event).scoutId)
  if (!Number.isInteger(scoutId)) throw createError({ statusCode: 400, message: 'No scout' })
  if (!(await scopedScouts(me)).some(r => r.id === scoutId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const db = await useDb()
  const gone = await db.delete(s.scoutAchievements)
    .where(and(eq(s.scoutAchievements.scoutId, scoutId), eq(s.scoutAchievements.achievementId, badgeId)))
    .returning()
  if (!gone.length) throw createError({ statusCode: 404, message: 'Δεν έχει αυτό το πτυχίο' })
  // an award made by mistake should leave no trace: its notification goes from
  // the scout's bell too, and so does the record that it was sent — so a later,
  // right award is announced afresh
  const mine = and(eq(s.notifications.scoutId, scoutId), eq(s.notifications.kind, 'badge'), eq(s.notifications.refId, badgeId))
  await db.delete(s.notifications).where(mine)
  await db.delete(s.notificationLog).where(and(eq(s.notificationLog.scoutId, scoutId),
    eq(s.notificationLog.kind, 'badge'), eq(s.notificationLog.refId, badgeId)))
  return { ok: true }
})
