import { eq, inArray, or } from 'drizzle-orm'
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
    // their mission photos go with them
    const photos = (await tx.select().from(s.missionSubmissions).where(eq(s.missionSubmissions.scoutId, id))).map(x => x.fileId)
    await tx.delete(s.missionSubmissions).where(eq(s.missionSubmissions.scoutId, id))
    if (photos.length) await tx.delete(s.files).where(inArray(s.files.id, photos))
    for (const t of [
      s.challengeAnswers, s.challengeReveals, s.eventReviews, s.eventRsvps,
      s.scoutAchievements, s.requirementAwards, s.ventureAwards, s.ventureLogs, s.ventureMilestones,
      s.pointAwards, s.pollVotes, s.pushSubscriptions, s.notifications, s.notificationLog,
      s.leaderScopes, s.notifyGroupLeaders, s.notifyGroupMembers, s.packChallengeDone, s.parentChildren, s.scoutRewards
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
    // what they saw, the 👏 they gave and got, the playground's doings
    await tx.delete(s.contentViews).where(eq(s.contentViews.scoutId, id))
    await tx.delete(s.scoutKudos).where(or(eq(s.scoutKudos.fromId, id), eq(s.scoutKudos.toId, id)))
    await tx.delete(s.leaderFun).where(or(eq(s.leaderFun.fromId, id), eq(s.leaderFun.toId, id)))
    await tx.delete(s.funBag).where(eq(s.funBag.scoutId, id))
    await tx.delete(s.funGrants).where(eq(s.funGrants.scoutId, id))
    await tx.delete(s.registrations).where(eq(s.registrations.scoutId, id))
    await tx.delete(s.kimPlays).where(eq(s.kimPlays.scoutId, id))
    await tx.delete(s.northPlays).where(eq(s.northPlays.scoutId, id))
    await tx.delete(s.kimChallenges).where(or(eq(s.kimChallenges.fromId, id), eq(s.kimChallenges.toId, id)))
    await tx.delete(s.hotPotato).where(or(eq(s.hotPotato.startedBy, id), eq(s.hotPotato.holderId, id), eq(s.hotPotato.prevId, id), eq(s.hotPotato.burnedId, id)))
    await tx.delete(s.scouts).where(eq(s.scouts.id, id))
  })
}

/** Members trashed more than 30 days ago are removed for good. */
/** Deletes for good the members trashed 30+ days ago; returns who they were,
    for the scheduled job's log. */
export async function purgeTrashedScouts(nowIso: string): Promise<string[]> {
  const db = (await useDb())
  const cutoff = new Date(Date.parse(nowIso) - 30 * 86400_000).toISOString()
  const due = (await db.select().from(s.scouts)).filter(r => r.deletedAt && r.deletedAt <= cutoff)
  for (const r of due) await cascadeDeleteScout(r.id)
  return due.map(r => `${r.firstName} ${r.lastName} (#${r.id}, trashed ${r.deletedAt!.slice(0, 10)})`)
}
