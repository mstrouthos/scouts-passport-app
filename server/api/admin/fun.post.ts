import { and, eq, gt, gte, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { funAction, funAllowed, isPlay, anonNote, isThrowable, funRound, throwsNote, FUN_ROUND } from '../../../utils/fun'
import { dailyBag, take, bagOf } from '../../utils/funBag'
import { FUN_COOLDOWN_MS, cyprusDayStart, cyprusWeekStart, funPaused, tellFun } from '../../utils/leaderFun'
import { shortName } from '../../../utils/shortName'

/** One Βαθμοφόρος does something to another — a tomato, a high five — and
    the other is told. The guardrails, so it stays a laugh and never a
    nuisance: never to oneself; ten, then two hours' rest, then ten more —
    twenty a day (at whomever — all of them at one person if you like); not
    the same thing at the same person twice in a breath; nothing they have
    opted out of (tomatoes, or all of it); several things thrown by one person
    are told as one ("σου πέταξε 3 πράγματα"); a phone buzzes for the first
    couple, and never at night — the rest are bundled; and the Αρχηγός
    Συστήματος can pause it all.

    `anon`: "who did it?" — once a week, something thrown without a name. The
    one it hit has three guesses (fun/guess.post.ts); only to someone who
    takes everything, never a shove or a kind thing. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (await funPaused()) throw createError({ statusCode: 403, message: 'Η παρέα κάνει διάλειμμα' })
  const b = await readBody<{ to?: number, action?: string, anon?: boolean }>(event)
  const act = funAction(String(b?.action || ''))
  const to = Number(b?.to)
  if (!act || !isPlay(act) || !Number.isInteger(to)) throw createError({ statusCode: 400, message: 'Bad action' })
  if (to === me.id) throw createError({ statusCode: 400, message: 'Όχι στον εαυτό σου 😄' })
  if (me.funPref === 'off') throw createError({ statusCode: 403, message: 'Έχεις βγει από την παρέα (Ρυθμίσεις παρέας)' })
  const db = await useDb()
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, to)).limit(1))[0]
  if (!target || target.role === 'scout' || !target.isActive || target.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  // a hidden test account plays only with itself
  if (me.isHidden || target.isHidden) throw createError({ statusCode: 403, message: 'Οι δοκιμαστικοί λογαριασμοί δεν παίζουν με πραγματικούς Βαθμοφόρους' })
  if (!funAllowed(target.funPref, act))
    throw createError({ statusCode: 403, message: target.funPref === 'kind' ? `${target.firstName}: μόνο τα καλά 🤗` : `${target.firstName} δεν παίζει τώρα` })
  const anon = !!b?.anon
  if (anon) {
    if (act.motion !== 'throw' || target.funPref !== 'all') throw createError({ statusCode: 400, message: 'Ανώνυμα μόνο κάτι που πετιέται 🕶️' })
    const week = cyprusWeekStart()
    const used = (await db.select().from(s.leaderFun).where(and(eq(s.leaderFun.fromId, me.id), gt(s.leaderFun.createdAt, week)))).some(r => r.anon)
    if (used) throw createError({ statusCode: 429, message: 'Ένα ανώνυμο την εβδομάδα 🕶️ Ξανά από Δευτέρα!' })
  }
  const today = cyprusDayStart()
  // what the games did on their own (a throw-back, a potato) is not counted
  const mine = (await db.select().from(s.leaderFun).where(and(eq(s.leaderFun.fromId, me.id), gt(s.leaderFun.createdAt, today)))).filter(r => !r.auto)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const round = funRound(mine.map(r => r.createdAt))
  if (round.done) throw createError({ statusCode: 429, message: 'Αρκετά για σήμερα! Ξανά αύριο 🍅' })
  if (round.readyAt) {
    const at = new Date(round.readyAt).toLocaleTimeString('el-GR', { timeZone: 'Europe/Nicosia', hour: '2-digit', minute: '2-digit', hour12: false })
    throw createError({ statusCode: 429, message: `Έριξες τα ${FUN_ROUND} σου — ξεκουράσου! Τα επόμενα ${FUN_ROUND} από τις ${at} ⏳` })
  }
  if (mine.some(r => r.toId === to && r.action === act.key && Date.now() - Date.parse(r.createdAt) < FUN_COOLDOWN_MS))
    throw createError({ statusCode: 429, message: 'Πάρε μια ανάσα πρώτα 😄' })
  // a throwable comes out of the backpack (kind things and shoves are free)
  if (isThrowable(act.key)) {
    await dailyBag(me.id)
    if (!(await take(me.id, act.key))) throw createError({ statusCode: 409, message: `Δεν έχεις άλλο ${act.emoji} στο σακίδιο 🎒 — ο ανεφοδιασμός έρχεται στις 06:00 και στις 15:00, κι άλλα κερδίζεις στην καυτή πατάτα και στο Ταψί του Κιμ` })
  }
  const [row] = await db.insert(s.leaderFun).values({ fromId: me.id, toId: to, action: act.key, createdAt: now(), anon }).returning()
  /* more thrown by me while they have not looked: the one notification they
     have of mine grows ("σου πέταξε 3 πράγματα") instead of a new one each
     time, and their phone is not buzzed again for it */
  let told = false
  if (isThrowable(act.key) && !anon) {
    const since = new Date(Date.now() - 3 * 3600_000).toISOString()
    const open = (await db.select().from(s.notifications).where(and(eq(s.notifications.scoutId, to), eq(s.notifications.kind, 'fun'),
      isNull(s.notifications.readAt), isNull(s.notifications.dismissedAt), gt(s.notifications.createdAt, since)))).sort((a, b) => b.id - a.id)
    for (const n of open) {
      const first = (await db.select().from(s.leaderFun).where(eq(s.leaderFun.id, n.refId)).limit(1))[0]
      if (!first || first.fromId !== me.id || first.anon || !isThrowable(first.action)) continue
      const all = (await db.select().from(s.leaderFun).where(and(eq(s.leaderFun.fromId, me.id), eq(s.leaderFun.toId, to), gte(s.leaderFun.id, first.id))))
        .filter(r => !r.anon && !r.auto && isThrowable(r.action)).sort((a, b) => a.id - b.id)
      await db.update(s.notifications).set({ body: throwsNote(shortName(me), all.map(r => r.action)), createdAt: now() }).where(eq(s.notifications.id, n.id))
      told = true
      break
    }
  }
  if (!told) await tellFun(to, { body: anon ? anonNote(act) : act.noteEl.replace('{name}', shortName(me)), refId: row.id })
  return { ok: true, id: row.id, round: funRound([...mine.map(r => r.createdAt), row.createdAt]), bag: await bagOf(me.id) }
})
