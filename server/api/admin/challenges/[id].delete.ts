import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'
import { challengeInScope } from '../../../utils/challengeScope'

/** Remove a challenge and everything hanging off it. Answers are deleted too,
    so any points they awarded stop counting — deliberate, since a deleted
    question should not keep influencing the leaderboard. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await challengeInScope(me, id)
  const db = (await useDb())
  await db.delete(s.challengeAnswers).where(eq(s.challengeAnswers.challengeId, id))
  await db.delete(s.challengeOptions).where(eq(s.challengeOptions.challengeId, id))
  await db.delete(s.challenges).where(eq(s.challenges.id, id))
  return { ok: true }
})
