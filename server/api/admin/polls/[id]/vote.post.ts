import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { pollsFor } from '../../../../utils/polls'
import { now } from '../../../../utils/passcode'

/** Cast or change a vote. A single-choice poll replaces the previous answer. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const pollId = idParam(event)
  const db = await useDb()

  // visibility is the permission: if it is not being put to you, you cannot vote
  const poll = (await pollsFor(me)).find(p => p.id === pollId)
  if (!poll) throw createError({ statusCode: 404, message: 'Not found' })
  if (poll.isClosed) throw createError({ statusCode: 400, message: 'Η ψηφοφορία έκλεισε' })

  const b = await readBody<{ optionIds?: number[] }>(event)
  const wanted = [...new Set((b?.optionIds || []).map(Number).filter(Number.isInteger))]
  const valid = new Set(poll.options.map(o => o.id))
  if (wanted.some(o => !valid.has(o)))
    throw createError({ statusCode: 400, message: 'Bad option' })
  if (!poll.isMulti && wanted.length > 1)
    throw createError({ statusCode: 400, message: 'Μία επιλογή μόνο' })

  await db.delete(s.pollVotes)
    .where(and(eq(s.pollVotes.pollId, pollId), eq(s.pollVotes.scoutId, me.id)))
  if (wanted.length)
    await db.insert(s.pollVotes).values(wanted.map(optionId => ({
      pollId, optionId, scoutId: me.id, votedAt: now()
    })))
  return { ok: true, optionIds: wanted }
})
