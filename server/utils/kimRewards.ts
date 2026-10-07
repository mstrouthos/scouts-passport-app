import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { grant, randomItems } from './funBag'
import { tellFun } from './leaderFun'
import { kimDay } from '../../utils/kim'

/* Το Ταψί του Κιμ's prizes when a day and a week are over: whoever was first
   yesterday gets an ordinary thing for the backpack; whoever did best over
   last week (Monday to Sunday) gets a rare one. Given once — the cron sees
   to it, and so does opening the tray, should the cron be late. */

const done = async (reason: string, ref: string) => {
  const db = await useDb()
  return (await db.select({ id: s.funGrants.id }).from(s.funGrants).where(and(eq(s.funGrants.reason, reason), eq(s.funGrants.ref, ref)))).length > 0
}
const dayShift = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)

export async function kimPrizes() {
  const db = await useDb()
  const today = kimDay()
  const plays = (await db.select().from(s.kimPlays)).filter(p => p.answeredAt && p.correct != null)
  const out: string[] = []

  // yesterday's best: most remembered, then fastest
  const y = dayShift(today, -1)
  if (!(await done('kim-day', y))) {
    const best = plays.filter(p => p.day === y).sort((a, b) => b.correct! - a.correct! || a.ms! - b.ms!)[0]
    if (best && best.correct! > 0) {
      const got = await grant(best.scoutId, randomItems(1, { tier: 'common' }), 'kim-day', y)
      if (got) {
        out.push('day')
        await tellFun(best.scoutId, { title: '🧠 Το Ταψί του Κιμ', kind: 'kim', refId: best.id, body: '🥇 Ήσουν πρώτος/η στο χθεσινό Ταψί του Κιμ! Κέρδισες κάτι για το σακίδιό σου 🎒' })
      }
    }
  }

  // last week's best, on the Monday after: most remembered over the week, then fastest
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  const weekStart = dayShift(today, -dow - 7)
  if (!(await done('kim-week', weekStart))) {
    const days = new Set(Array.from({ length: 7 }, (_, i) => dayShift(weekStart, i)))
    const tally = new Map<number, { correct: number, ms: number }>()
    for (const p of plays.filter(p => days.has(p.day))) {
      const t = tally.get(p.scoutId) || { correct: 0, ms: 0 }
      tally.set(p.scoutId, { correct: t.correct + p.correct!, ms: t.ms + (p.ms || 0) })
    }
    const best = [...tally.entries()].sort((a, b) => b[1].correct - a[1].correct || a[1].ms - b[1].ms)[0]
    if (best && best[1].correct > 0) {
      const got = await grant(best[0], randomItems(1, { tier: 'rare' }), 'kim-week', weekStart)
      if (got) {
        out.push('week')
        await tellFun(best[0], { title: '🧠 Το Ταψί του Κιμ', kind: 'kim', refId: 0, body: '🏆 Ήσουν πρώτος/η της εβδομάδας στο Ταψί του Κιμ! Κέρδισες κάτι σπάνιο για το σακίδιό σου 🥧' })
      }
    }
  }
  return out
}
