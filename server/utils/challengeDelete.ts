import { inArray, sql } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/** Remove questions and every row that hangs off them.

   A question is deletable even after scouts have answered it: the answers go
   with it, so the points they awarded stop counting — deliberate, since a
   deleted question should not keep influencing the leaderboard.

   Children are deleted before their parent and the whole thing runs in one
   transaction, so a question can never be left half-removed. Anything new that
   references challenges belongs in this list — a missing child does not fail
   quietly, it makes deletion impossible with a foreign-key error. */
export async function deleteChallenges(ids: number[]): Promise<void> {
  if (!ids.length) return
  const db = await useDb()
  await db.transaction(async tx => {
    await tx.delete(s.challengeAnswers).where(inArray(s.challengeAnswers.challengeId, ids))
    await tx.delete(s.challengeReveals).where(inArray(s.challengeReveals.challengeId, ids))
    await tx.delete(s.challengeOptions).where(inArray(s.challengeOptions.challengeId, ids))
    await tx.delete(s.challenges).where(inArray(s.challenges.id, ids))

    // The number on a question is its row id, and leaders read it as "question
    // one". Once the last question is gone there is nothing left to collide
    // with, so the counter goes back to 1 and a fresh set starts at #1 rather
    // than #96. Only ever when the table is empty — restarting under existing
    // rows would hand out ids that are already taken.
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.challenges)
    if (n === 0) {
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('challenges', 'id'), 1, false)`)
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('challenge_options', 'id'), 1, false)`)
    }
  })
}
