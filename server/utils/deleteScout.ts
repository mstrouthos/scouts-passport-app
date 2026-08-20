import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/** Cascades every row that references a scout, then removes the scout itself.
    Shared by the single-scout delete endpoint and the troop-wide roster reset. */
export async function cascadeDeleteScout(id: number) {
  const db = (await useDb())
  await db.delete(s.challengeAnswers).where(eq(s.challengeAnswers.scoutId, id))
  await db.delete(s.eventReviews).where(eq(s.eventReviews.scoutId, id))
  await db.delete(s.scoutAchievements).where(eq(s.scoutAchievements.scoutId, id))
  await db.delete(s.pointAwards).where(eq(s.pointAwards.scoutId, id))
  await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.scoutId, id))
  await db.delete(s.notifications).where(eq(s.notifications.scoutId, id))
  await db.delete(s.notificationLog).where(eq(s.notificationLog.scoutId, id))
  await db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, id))
  await db.delete(s.scouts).where(eq(s.scouts.id, id))
}
