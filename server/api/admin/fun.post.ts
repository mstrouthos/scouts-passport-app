import { and, eq, gt } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { funAction, funAllowed, isPlay, anonNote } from '../../../utils/fun'
import { FUN_LIMIT_DAY, FUN_PER_TARGET_DAY, FUN_COOLDOWN_MS, cyprusDayStart, cyprusWeekStart, funPaused, tellFun } from '../../utils/leaderFun'

/** One Βαθμοφόρος does something to another — a tomato, a high five — and
    the other is told. The guardrails, so it stays a laugh and never a
    nuisance: never to oneself; ten a day, three at any one person; not the
    same thing at the same person twice in a breath; nothing they have opted
    out of (tomatoes, or all of it); a phone buzzes for the first in an hour,
    and never at night — the rest wait in the bell; and the Αρχηγός
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
  if (mine.length >= FUN_LIMIT_DAY) throw createError({ statusCode: 429, message: 'Αρκετά για σήμερα! Τα πυρομαχικά ξαναγεμίζουν αύριο 🍅' })
  if (mine.filter(r => r.toId === to).length >= FUN_PER_TARGET_DAY) throw createError({ statusCode: 429, message: `Αρκετά στον/στην ${target.firstName} για σήμερα 😄` })
  if (mine.some(r => r.toId === to && r.action === act.key && Date.now() - Date.parse(r.createdAt) < FUN_COOLDOWN_MS))
    throw createError({ statusCode: 429, message: 'Πάρε μια ανάσα πρώτα 😄' })
  const [row] = await db.insert(s.leaderFun).values({ fromId: me.id, toId: to, action: act.key, createdAt: now(), anon }).returning()
  await tellFun(to, { body: anon ? anonNote(act) : act.noteEl.replace('{name}', me.firstName), refId: row.id })
  return { ok: true, id: row.id, left: FUN_LIMIT_DAY - mine.length - 1 }
})
