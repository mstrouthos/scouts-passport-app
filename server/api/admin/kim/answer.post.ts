import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay, kimTray, KIM_COVER_MS, KIM_MISSING } from '../../../../utils/kim'
import { tellFun } from '../../../utils/leaderFun'

/** What I say went missing from today's tray. Scored here: how many of the
    four I got, and how long it all took from the tray's uncovering (less
    the cloth going down and up) — looking longer costs time, so "Έτοιμος/η!"
    early is a gamble. Whoever
    dared me today is told how I did against them. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const raw = (await readBody<{ picks?: string[] }>(event))?.picks
  const db = await useDb()
  const day = kimDay()
  const play = (await db.select().from(s.kimPlays)).find(p => p.scoutId === me.id && p.day === day)
  if (!play) throw createError({ statusCode: 400, message: 'Πρώτα κοίτα το ταψί 🧠' })
  if (play.answeredAt) throw createError({ statusCode: 409, message: 'Το σημερινό ταψί το έπαιξες ήδη — ξανά αύριο! 🧠' })
  const t = kimTray(day)
  const picks = [...new Set((Array.isArray(raw) ? raw : []).map(String))].filter(k => t.choices.includes(k)).slice(0, KIM_MISSING)
  const gone = t.missing.map(i => t.tray[i])
  const correct = picks.filter(k => gone.includes(k)).length
  const ms = Math.max(0, Date.now() - Date.parse(play.startedAt) - KIM_COVER_MS)
  // once only, even if sent twice
  const done = await db.update(s.kimPlays).set({ answeredAt: now(), correct, ms, picks: JSON.stringify(picks) })
    .where(and(eq(s.kimPlays.id, play.id), isNull(s.kimPlays.answeredAt))).returning()
  if (!done.length) throw createError({ statusCode: 409, message: 'Το σημερινό ταψί το έπαιξες ήδη — ξανά αύριο! 🧠' })

  // whoever dared me hears how it went
  const secs = (n: number) => (n / 1000).toFixed(1).replace('.', ',')
  for (const d of (await db.select().from(s.kimChallenges).where(and(eq(s.kimChallenges.toId, me.id), eq(s.kimChallenges.day, day))))) {
    const theirs = (await db.select().from(s.kimPlays)).find(p => p.scoutId === d.fromId && p.day === day)
    const beat = theirs?.correct == null ? null
      : correct > theirs.correct || (correct === theirs.correct && ms < (theirs.ms ?? 0)) ? 'σε νίκησε! 😱'
      : correct === theirs.correct && ms === theirs.ms ? 'ισοπαλία! 🤝' : 'δεν σε έφτασε 😎'
    await tellFun(d.fromId, {
      title: '🧠 Το Ταψί του Κιμ', kind: 'kim', refId: d.id,
      body: `${me.firstName} έπαιξε: ${correct}/${KIM_MISSING} σε ${secs(ms)}″${beat ? ' — ' + beat : ''}`
    })
  }
  return { correct, ms, picks, gone }
})
