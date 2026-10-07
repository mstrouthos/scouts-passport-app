import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { FUN_GAME } from '../../../../utils/fun'
import { activePotato, potatoTick, potatoDeadline, potatoPool, potatoCycle, potatoTargets, funPaused, tellFun } from '../../../utils/leaderFun'

/** The hot potato. With none in play, anyone who takes everything may start
    one by throwing it at someone; whoever holds it has three waking hours to
    pass it on, or it burns in their hands — and the game goes on until it
    does. It is fair: it goes only to someone who has not had it yet this
    round, and once the last of them has it, the round starts over and it may
    go to anyone. Only those who take everything play. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (await funPaused()) throw createError({ statusCode: 403, message: 'Η παρέα κάνει διάλειμμα' })
  if (me.funPref !== 'all') throw createError({ statusCode: 403, message: 'Η πατάτα είναι μόνο για όσους δέχονται τα πάντα 🥔' })
  const to = Number((await readBody<{ to?: number }>(event))?.to)
  if (!Number.isInteger(to) || to === me.id) throw createError({ statusCode: 400, message: 'Σε κάποιον άλλον 😄' })
  const db = await useDb()
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, to)).limit(1))[0]
  if (!target || target.role === 'scout' || !target.isActive || target.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  if (me.isHidden || target.isHidden) throw createError({ statusCode: 403, message: 'Οι δοκιμαστικοί λογαριασμοί δεν παίζουν με πραγματικούς Βαθμοφόρους' })
  if (target.funPref !== 'all') throw createError({ statusCode: 403, message: `${target.firstName} δεν παίζει με την πατάτα` })

  await potatoTick()
  const p = await activePotato()
  const t = now()
  const pool = await potatoPool()
  // the round so far, with the one it now goes to; when that was the last of
  // them, a new round begins with them alone — they may throw it at anyone
  const round = (cycle: number[]) => pool.every(id => cycle.includes(id)) ? [to] : cycle
  let cycle: number[]
  if (p) {
    if (p.holderId !== me.id) throw createError({ statusCode: 409, message: 'Την πατάτα την έχει άλλος 🥔' })
    if (!potatoTargets(pool, potatoCycle(p), me.id).includes(to))
      throw createError({ statusCode: 400, message: `${target.firstName} την είχε ήδη σε αυτόν τον γύρο — διάλεξε κάποιον που δεν την έχει πιάσει 🥔` })
    cycle = round([...potatoCycle(p), to])
    await db.update(s.hotPotato).set({ holderId: to, prevId: me.id, gotAt: t, deadline: potatoDeadline(), warned: false, passes: p.passes + 1, cycle: JSON.stringify(cycle) })
      .where(eq(s.hotPotato.id, p.id))
  } else {
    cycle = round([me.id, to])
    await db.insert(s.hotPotato).values({ startedBy: me.id, holderId: to, prevId: me.id, gotAt: t, deadline: potatoDeadline(), passes: 1, startedAt: t, cycle: JSON.stringify(cycle) })
  }
  const [row] = await db.insert(s.leaderFun).values({ fromId: me.id, toId: to, action: 'potato', createdAt: t, auto: true }).returning()
  await tellFun(to, { body: FUN_GAME[0].noteEl.replace('{name}', me.firstName), refId: row.id }, true)
  return { ok: true, id: row.id, newRound: cycle.length === 1 }
})
