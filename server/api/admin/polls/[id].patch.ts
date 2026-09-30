import { eq, and, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam, rankOf } from '../../../utils/guard'

/** Close or reopen a poll, or edit it — even while it is running. Its author,
    or the Αρχηγός Συστήματος.

    Editing keeps the votes already cast: an option renamed keeps its votes
    (it is the same option), options can be added, and an option removed takes
    only its own votes with it. Who it is put to does not change once asked. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const poll = (await db.select().from(s.polls).where(eq(s.polls.id, id)).limit(1))[0]
  if (!poll) throw createError({ statusCode: 404, message: 'Not found' })
  if (poll.createdBy !== me.id && (await rankOf(me)) !== 'admin')
    throw createError({ statusCode: 403, message: 'Δεν είναι δική σου ψηφοφορία' })

  const b = await readBody<{
    isClosed?: boolean, questionEl?: string, isMulti?: boolean,
    options?: Array<{ id?: number, textEl?: string }>
  }>(event)

  if (typeof b?.isClosed === 'boolean')
    await db.update(s.polls).set({ isClosed: b.isClosed }).where(eq(s.polls.id, id))

  const patch: Partial<typeof s.polls.$inferInsert> = {}
  if (b?.questionEl !== undefined) {
    const q = String(b.questionEl).trim()
    if (!q) throw createError({ statusCode: 400, message: 'Χρειάζεται ερώτηση' })
    patch.questionEl = q
  }

  if (b?.options !== undefined) {
    const wanted = b.options.map(o => ({ id: o.id ? Number(o.id) : undefined, textEl: String(o.textEl || '').trim() }))
      .filter(o => o.textEl)
    if (wanted.length < 2) throw createError({ statusCode: 400, message: 'Χρειάζονται τουλάχιστον δύο επιλογές' })
    const current = await db.select().from(s.pollOptions).where(eq(s.pollOptions.pollId, id))
    const mine = new Set(current.map(o => o.id))
    if (wanted.some(o => o.id && !mine.has(o.id))) throw createError({ statusCode: 400, message: 'Bad option' })
    // removed options go, with their votes
    const keep = new Set(wanted.filter(o => o.id).map(o => o.id!))
    const gone = current.filter(o => !keep.has(o.id)).map(o => o.id)
    if (gone.length) {
      await db.delete(s.pollVotes).where(and(eq(s.pollVotes.pollId, id), inArray(s.pollVotes.optionId, gone)))
      await db.delete(s.pollOptions).where(inArray(s.pollOptions.id, gone))
    }
    // kept ones renamed and reordered, new ones added, in the order given
    for (const [idx, o] of wanted.entries()) {
      if (o.id) await db.update(s.pollOptions).set({ textEl: o.textEl, idx }).where(eq(s.pollOptions.id, o.id))
      else await db.insert(s.pollOptions).values({ pollId: id, textEl: o.textEl, idx })
    }
  }

  if (typeof b?.isMulti === 'boolean' && b.isMulti !== poll.isMulti) {
    // one choice each, from now on: only if nobody already holds more than one
    if (!b.isMulti) {
      const votes = await db.select().from(s.pollVotes).where(eq(s.pollVotes.pollId, id))
      const per = new Map<number, number>()
      for (const v of votes) per.set(v.scoutId, (per.get(v.scoutId) || 0) + 1)
      if ([...per.values()].some(n => n > 1))
        throw createError({ statusCode: 400, message: 'Κάποιοι έχουν ήδη διαλέξει πάνω από μία επιλογή — δεν γίνεται να γίνει μονής επιλογής' })
    }
    patch.isMulti = b.isMulti
  }

  if (Object.keys(patch).length) await db.update(s.polls).set(patch).where(eq(s.polls.id, id))
  return { ok: true }
})
