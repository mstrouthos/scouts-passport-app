import { and, gte, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { kimDay } from '../../utils/kim'
import { funAction } from '../../utils/fun'
import { GAME_RANK } from '../../utils/games'
import type { GameKey } from '../../utils/games'
import { potatoPool } from './leaderFun'

/* The Βαθμοφόροι's mini-games, added up: one total across all of them, for a
   week or the scout year. What each game is worth is in GAME_RANK
   (utils/games.ts), so the page can say it. */

export type Parts = Record<GameKey, number>
const empty = (): Parts => ({ throw: 0, potato: 0, kim: 0, north: 0 })

// Cyprus days, and an hour on one as an instant (+03:00 in summer, +02:00 in winter)
const shift = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)
const nextDay = (day: string) => shift(day, 1)
const prevDay = (day: string) => shift(day, -1)
function cyprusAt(day: string, hour: number) {
  const hh = String(hour).padStart(2, '0')
  for (const off of ['+03:00', '+02:00']) {
    const t = Date.parse(`${day}T${hh}:00:00${off}`)
    if (Number(new Date(t).toLocaleString('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', hour12: false })) === hour) return t
  }
  return Date.parse(`${day}T${hh}:00:00+02:00`)
}

export async function gameScores(sinceIso: string): Promise<Map<number, Parts>> {
  const db = await useDb()
  const sinceDay = kimDay(new Date(sinceIso))
  const out = new Map<number, Parts>()
  const add = (id: number, g: GameKey, n: number) => { if (!n) return; const p = out.get(id) || empty(); p[g] += n; out.set(id, p) }

  // the potato: every throw of it (one made for someone left out, not theirs)
  const dayMs = 86400_000
  const fun = await db.select().from(s.leaderFun).where(gte(s.leaderFun.createdAt, new Date(Date.parse(sinceIso) - 2 * dayMs).toISOString()))
  for (const r of fun) if (r.createdAt >= sinceIso && r.action === 'potato' && r.outcome !== 'forced') add(r.fromId, 'potato', GAME_RANK.potatoPass)

  // Σπλατς: the day's target — whoever had the most thrown at them from 23:00
  // the evening before to 23:00 (as funDaily.ts announces it), all of them on
  // a tie; only days already told, and test accounts never count
  const hidden = new Set((await db.select({ id: s.scouts.id, isHidden: s.scouts.isHidden }).from(s.scouts)).filter(x => x.isHidden).map(x => x.id))
  const throws = fun.filter(r => funAction(r.action)?.motion === 'throw' && !hidden.has(r.toId))
  for (let day = sinceDay, guard = 0; day <= kimDay() && guard < 400; day = nextDay(day), guard++) {
    const end = cyprusAt(day, 23), start = cyprusAt(prevDay(day), 23)
    if (end > Date.now() || end <= Date.parse(sinceIso)) continue
    const per = new Map<number, number>()
    for (const r of throws) { const t = Date.parse(r.createdAt); if (t > start && t <= end) per.set(r.toId, (per.get(r.toId) || 0) + 1) }
    const most = Math.max(0, ...per.values())
    if (most) for (const [id, n] of per) if (n === most) add(id, 'throw', GAME_RANK.dailyTarget)
  }
  // a round that burst: everyone who was playing the potato then — held it or
  // not, since being thrown it is up to the others — but the one it burst on.
  // (A round that burst before this was kept counts today's players.)
  const rounds = (await db.select().from(s.hotPotato).where(and(isNotNull(s.hotPotato.burnedId), gte(s.hotPotato.endedAt, sinceIso))))
  const nowPlaying = rounds.some(p => !p.players) ? await potatoPool() : []
  for (const p of rounds) {
    let players: number[] = nowPlaying
    try { if (p.players) players = JSON.parse(p.players) } catch {}
    for (const id of players) if (id !== p.burnedId) add(id, 'potato', GAME_RANK.potatoSurvive)
  }
  // Κιμ: every thing remembered; Βορράς: its own points, a tenth of them
  for (const k of (await db.select().from(s.kimPlays)).filter(k => k.day >= sinceDay && k.answeredAt)) add(k.scoutId, 'kim', (k.correct || 0) * GAME_RANK.kimPerThing)
  for (const n of (await db.select().from(s.northPlays)).filter(n => n.day >= sinceDay && n.answeredAt)) add(n.scoutId, 'north', Math.round((n.points || 0) / GAME_RANK.northDiv))
  return out
}
export const totalOf = (p: Parts) => p.throw + p.potato + p.kim + p.north
