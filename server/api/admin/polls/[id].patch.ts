import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam, rankOf } from '../../../utils/guard'

/** Close or reopen a poll — its author, or the Αρχηγός Συστήματος. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const poll = (await db.select().from(s.polls).where(eq(s.polls.id, id)).limit(1))[0]
  if (!poll) throw createError({ statusCode: 404, message: 'Not found' })
  if (poll.createdBy !== me.id && (await rankOf(me)) !== 'admin')
    throw createError({ statusCode: 403, message: 'Δεν είναι δική σου ψηφοφορία' })

  const b = await readBody<{ isClosed?: boolean }>(event)
  if (typeof b?.isClosed === 'boolean')
    await db.update(s.polls).set({ isClosed: b.isClosed }).where(eq(s.polls.id, id))
  return { ok: true }
})
