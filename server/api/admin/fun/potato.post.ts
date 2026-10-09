import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { FUN_GAME, pouchOf } from '../../../../utils/fun'
import { grant, randomItems, type Items } from '../../../utils/funBag'
import { activePotato, potatoTick, potatoPool, potatoCycle, potatoTargets, funPaused, tellFun } from '../../../utils/leaderFun'
import { shortName } from '../../../../utils/shortName'

/** The hot potato (server/utils/leaderFun.ts): passing it on. The round
    itself the app starts, once a week, by throwing it to someone at random
    (potatoWeekly). Whoever holds it passes it on whenever they like — but whoever has it when
    it bursts does the challenge. It is fair: it goes only to someone who has
    not had it yet this round, and once the last of them has it, it may go to
    anyone again. Only those who take everything play. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (await funPaused()) throw createError({ statusCode: 403, message: 'Η παρέα κάνει διάλειμμα' })
  if (me.funPref !== 'all') throw createError({ statusCode: 403, message: 'Η πατάτα είναι μόνο για όσους δέχονται τα πάντα 🥔' })
  if (me.gamesExcluded) throw createError({ statusCode: 403, message: 'Ο Αρχηγός σε έχει βγάλει από την Καυτή Πατάτα για τώρα 🥔' })
  const to = Number((await readBody<{ to?: number }>(event))?.to)
  if (!Number.isInteger(to) || to === me.id) throw createError({ statusCode: 400, message: 'Σε κάποιον άλλον 😄' })
  const db = await useDb()
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, to)).limit(1))[0]
  if (!target || target.role === 'scout' || !target.isActive || target.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  if (me.isHidden || target.isHidden) throw createError({ statusCode: 403, message: 'Οι δοκιμαστικοί λογαριασμοί δεν παίζουν με πραγματικούς Βαθμοφόρους' })
  if (target.funPref !== 'all' || target.gamesExcluded) throw createError({ statusCode: 403, message: `${target.firstName} δεν παίζει με την πατάτα` })

  await potatoTick()
  const p = await activePotato()
  const t = now()
  const pool = await potatoPool()
  // the round so far, with the one it now goes to; when that was the last of
  // them, a new round begins with them alone — they may throw it at anyone
  const round = (cycle: number[]) => pool.every(id => cycle.includes(id)) ? [to] : cycle
  let cycle: number[]
  let paid: Items | null = null
  // the round is the app's to start, once a week, at random
  if (!p) throw createError({ statusCode: 409, message: 'Η καυτή πατάτα πέφτει μόνη της μία φορά την εβδομάδα, σε κάποιον τυχαίο 🎲🥔' })
  if (p.holderId !== me.id) throw createError({ statusCode: 409, message: 'Την πατάτα την έχει άλλος 🥔' })
  if (!potatoTargets(pool, potatoCycle(p), me.id).includes(to))
    throw createError({ statusCode: 400, message: `${target.firstName} την είχε ήδη σε αυτόν τον γύρο — διάλεξε κάποιον που δεν την έχει πιάσει 🥔` })
  cycle = round([...potatoCycle(p), to])
  // danger pay: a thing for every half hour held, now that it is safely passed on
  const n = pouchOf(p.gotAt)
  if (n) paid = await grant(me.id, randomItems(n), 'potato', `${p.id}:${p.passes}`)
  await db.update(s.hotPotato).set({ holderId: to, prevId: me.id, gotAt: t, passes: p.passes + 1, cycle: JSON.stringify(cycle) })
    .where(eq(s.hotPotato.id, p.id))
  const [row] = await db.insert(s.leaderFun).values({ fromId: me.id, toId: to, action: 'potato', createdAt: t, auto: true }).returning()
  const note = FUN_GAME[0].noteEl.replace('{name}', shortName(me))
  await tellFun(to, { title: '🥔 Η καυτή πατάτα', kind: 'potato-pass', body: note, refId: row.id }, true)
  return { ok: true, id: row.id, newRound: cycle.length === 1, started: false, paid }
})
