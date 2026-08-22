import { inArray } from 'drizzle-orm'
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
  })
}
