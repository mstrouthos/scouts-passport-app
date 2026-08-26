import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam, rankOf } from '../../../utils/guard'

/** Remove a poll and everything cast in it. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const poll = (await db.select().from(s.polls).where(eq(s.polls.id, id)).limit(1))[0]
  if (!poll) throw createError({ statusCode: 404, message: 'Not found' })
  if (poll.createdBy !== me.id && (await rankOf(me)) !== 'admin')
    throw createError({ statusCode: 403, message: 'Δεν είναι δική σου ψηφοφορία' })

  // children first, in one transaction, so a poll cannot be half removed
  await db.transaction(async tx => {
    await tx.delete(s.pollVotes).where(eq(s.pollVotes.pollId, id))
    await tx.delete(s.pollOptions).where(eq(s.pollOptions.pollId, id))
    await tx.delete(s.polls).where(eq(s.polls.id, id))
  })
  return { ok: true }
})
