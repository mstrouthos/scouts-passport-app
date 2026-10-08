import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay, KIM_MISSING } from '../../../../utils/kim'
import { tellFun, funPaused } from '../../../utils/leaderFun'

/** "Can you beat that?": once I have played today's tray, I may dare up to
    three others who have not — each once. They are told my score. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (await funPaused()) throw createError({ statusCode: 403, message: 'Η παρέα κάνει διάλειμμα' })
  const to = Number((await readBody<{ to?: number }>(event))?.to)
  const db = await useDb()
  const day = kimDay()
  const plays = (await db.select().from(s.kimPlays)).filter(p => p.day === day)
  const mine = plays.find(p => p.scoutId === me.id)
  if (!mine?.answeredAt) throw createError({ statusCode: 400, message: 'Πρώτα παίξε εσύ το σημερινό ταψί 🧠' })
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, to)).limit(1))[0]
  if (!target || target.id === me.id || target.role === 'scout' || !target.isActive || target.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  if (me.isHidden || target.isHidden) throw createError({ statusCode: 403, message: 'Οι δοκιμαστικοί λογαριασμοί δεν παίζουν με πραγματικούς Βαθμοφόρους' })
  if (target.funPref === 'off' || target.gamesExcluded) throw createError({ statusCode: 403, message: `${target.firstName} δεν παίζει τώρα` })
  if (plays.some(p => p.scoutId === to && p.answeredAt)) throw createError({ statusCode: 409, message: `${target.firstName} το έπαιξε ήδη σήμερα` })
  const mineToday = (await db.select().from(s.kimChallenges).where(eq(s.kimChallenges.fromId, me.id))).filter(d => d.day === day)
  if (mineToday.some(d => d.toId === to)) throw createError({ statusCode: 409, message: `Τον/την ${target.firstName} τον/την προκάλεσες ήδη σήμερα` })
  if (mineToday.length >= 3) throw createError({ statusCode: 429, message: 'Τρεις προκλήσεις τη μέρα φτάνουν 😄' })
  const [d] = await db.insert(s.kimChallenges).values({ fromId: me.id, toId: to, day, createdAt: now() }).returning()
  const secs = ((mine.ms ?? 0) / 1000).toFixed(1).replace('.', ',')
  await tellFun(to, {
    title: '🧠 Το Ταψί του Κιμ', kind: 'kim', refId: d.id,
    body: `${me.firstName} θυμήθηκε ${mine.correct}/${KIM_MISSING} σε ${secs}″ στο σημερινό Ταψί του Κιμ. Μπορείς καλύτερα;`
  })
  return { ok: true }
})
