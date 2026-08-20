import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/** Cascades every row that references a scout, then removes the scout itself.
    Shared by the single-scout delete endpoint and the troop-wide roster reset. */
export function cascadeDeleteScout(id: number) {
  const db = useDb()
  db.delete(s.challengeAnswers).where(eq(s.challengeAnswers.scoutId, id)).run()
  db.delete(s.eventReviews).where(eq(s.eventReviews.scoutId, id)).run()
  db.delete(s.scoutAchievements).where(eq(s.scoutAchievements.scoutId, id)).run()
  db.delete(s.pointAwards).where(eq(s.pointAwards.scoutId, id)).run()
  db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.scoutId, id)).run()
  db.delete(s.notifications).where(eq(s.notifications.scoutId, id)).run()
  db.delete(s.notificationLog).where(eq(s.notificationLog.scoutId, id)).run()
  db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, id)).run()
  db.delete(s.scouts).where(eq(s.scouts.id, id)).run()
}
