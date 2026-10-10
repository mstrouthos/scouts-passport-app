import { requireLeader } from '../../../utils/guard'
import { stopPotato } from '../../../utils/leaderFun'

/** The Αρχηγός Συστήματος ends the round in play before it bursts: nobody
    gets the challenge. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.role !== 'troop_leader') throw createError({ statusCode: 403, message: 'Μόνο για διαχειριστές' })
  if (!(await stopPotato(me.id))) throw createError({ statusCode: 409, message: 'Δεν παίζεται καυτή πατάτα αυτή τη στιγμή' })
  return { ok: true }
})
