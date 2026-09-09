import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { childIdsOfParent } from './parents'

/** Removes a member and every row that references them, in one transaction.
    This is the list of foreign keys that point at scouts — all of them, or
    Postgres refuses and the member "cannot be deleted". Used by the purge
    that runs 30 days after a member was trashed, and by the Αρχηγός
    Συστήματος when a record must go now. */
export async function cascadeDeleteScout(id: number) {
  const db = (await useDb())
  await db.transaction(async tx => {
    for (const t of [
      s.challengeAnswers, s.challengeReveals, s.eventReviews, s.eventRsvps,
      s.scoutAchievements, s.requirementAwards, s.ventureAwards, s.ventureLogs, s.ventureMilestones,
      s.pointAwards, s.pollVotes, s.pushSubscriptions, s.notifications, s.notificationLog,
      s.leaderScopes, s.notifyGroupLeaders, s.notifyGroupMembers, s.packChallengeDone, s.parentChildren
    ] as any[]) {
      await tx.delete(t).where(eq(t.scoutId, id))
    }
    // a parent whose only child this was goes too; one with other children stays
    const links = await tx.select().from(s.parentChildren)
    for (const p of (await tx.select().from(s.parents)).filter(x => x.scoutId === id)) {
      const others = childIdsOfParent({ ...p, scoutId: null }, links)
      if (others.length) await tx.update(s.parents).set({ scoutId: others[0] }).where(eq(s.parents.id, p.id))
      else {
        await tx.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.parentId, p.id))
        await tx.delete(s.parentNotifications).where(eq(s.parentNotifications.parentId, p.id))
        await tx.delete(s.parents).where(eq(s.parents.id, p.id))
      }
    }
    await tx.delete(s.scouts).where(eq(s.scouts.id, id))
  })
}

/** Members trashed more than 30 days ago are removed for good. */
export async function purgeTrashedScouts(nowIso: string): Promise<number> {
  const db = (await useDb())
  const cutoff = new Date(Date.parse(nowIso) - 30 * 86400_000).toISOString()
  const due = (await db.select().from(s.scouts)).filter(r => r.deletedAt && r.deletedAt <= cutoff)
  for (const r of due) await cascadeDeleteScout(r.id)
  return due.length
}
