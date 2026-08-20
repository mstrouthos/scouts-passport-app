import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../utils/guard'

/** Permanent deletion — cascades every row that references this scout, then
    removes the scout itself. Deactivate (see PATCH) is the reversible default;
    this is for when a record genuinely needs to be gone. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  assertScoutInScope(me, id)
  const db = useDb()

  db.delete(s.challengeAnswers).where(eq(s.challengeAnswers.scoutId, id)).run()
  db.delete(s.eventReviews).where(eq(s.eventReviews.scoutId, id)).run()
  db.delete(s.scoutAchievements).where(eq(s.scoutAchievements.scoutId, id)).run()
  db.delete(s.pointAwards).where(eq(s.pointAwards.scoutId, id)).run()
  db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.scoutId, id)).run()
  db.delete(s.notifications).where(eq(s.notifications.scoutId, id)).run()
  db.delete(s.notificationLog).where(eq(s.notificationLog.scoutId, id)).run()
  db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, id)).run()

  try {
    db.delete(s.scouts).where(eq(s.scouts.id, id)).run()
  } catch {
    throw createError({ statusCode: 400, message: 'This record still has linked history and cannot be deleted' })
  }
  return { ok: true }
})
