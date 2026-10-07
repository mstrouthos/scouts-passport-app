import { and, eq, gt, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { FUN_GAME } from '../../../../utils/fun'
import { activePotato, potatoTick, potatoDeadline, cyprusDayStart, funPaused, tellFun } from '../../../utils/leaderFun'

/** The hot potato. With none in play (and none yet today), anyone who takes
    everything may start one by throwing it at someone; whoever holds it
    has four waking hours to pass it on — never straight back to the one who
    gave it — or it burns in their hands. Only those who take everything can
    be thrown it. */
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
  if (p) {
    if (p.holderId !== me.id) throw createError({ statusCode: 409, message: 'Την πατάτα την έχει άλλος 🥔' })
    if (p.prevId === to) throw createError({ statusCode: 400, message: 'Όχι πίσω σε όποιον σου την έδωσε! 🥔' })
    await db.update(s.hotPotato).set({ holderId: to, prevId: me.id, gotAt: t, deadline: potatoDeadline(), warned: false, passes: p.passes + 1 })
      .where(eq(s.hotPotato.id, p.id))
  } else {
    const today = cyprusDayStart()
    const todays = await db.select().from(s.hotPotato).where(and(gt(s.hotPotato.startedAt, today), isNotNull(s.hotPotato.endedAt)))
    if (todays.length) throw createError({ statusCode: 429, message: 'Μία πατάτα τη μέρα — η σημερινή έχει ήδη καεί 🔥' })
    await db.insert(s.hotPotato).values({ startedBy: me.id, holderId: to, prevId: me.id, gotAt: t, deadline: potatoDeadline(), passes: 1, startedAt: t })
  }
  const [row] = await db.insert(s.leaderFun).values({ fromId: me.id, toId: to, action: 'potato', createdAt: t, auto: true }).returning()
  await tellFun(to, { body: FUN_GAME[0].noteEl.replace('{name}', me.firstName), refId: row.id }, true)
  return { ok: true, id: row.id }
})
