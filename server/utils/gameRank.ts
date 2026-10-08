import { and, gte, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { kimDay } from '../../utils/kim'
import { GAME_RANK } from '../../utils/games'
import type { GameKey } from '../../utils/games'
import { potatoPool } from './leaderFun'

/* The Βαθμοφόροι's mini-games, added up: one total across all of them, for a
   week or the scout year. What each game is worth is in GAME_RANK
   (utils/games.ts), so the page can say it. */

export type Parts = Record<GameKey, number>
const empty = (): Parts => ({ throw: 0, potato: 0, kim: 0, north: 0 })

export async function gameScores(sinceIso: string): Promise<Map<number, Parts>> {
  const db = await useDb()
  const sinceDay = kimDay(new Date(sinceIso))
  const out = new Map<number, Parts>()
  const add = (id: number, g: GameKey, n: number) => { if (!n) return; const p = out.get(id) || empty(); p[g] += n; out.set(id, p) }

  // the potato: every throw of it. Σπλατς counts for nothing here — it is
  // for the fun of it, and what is thrown was won in the other games already
  const fun = await db.select().from(s.leaderFun).where(gte(s.leaderFun.createdAt, sinceIso))
  for (const r of fun) if (r.action === 'potato' && r.outcome !== 'forced') add(r.fromId, 'potato', GAME_RANK.potatoPass)
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
  // Κιμ: every thing remembered; Βορράς: its own points
  for (const k of (await db.select().from(s.kimPlays)).filter(k => k.day >= sinceDay && k.answeredAt)) add(k.scoutId, 'kim', (k.correct || 0) * GAME_RANK.kimPerThing)
  for (const n of (await db.select().from(s.northPlays)).filter(n => n.day >= sinceDay && n.answeredAt)) add(n.scoutId, 'north', n.points || 0)
  return out
}
export const totalOf = (p: Parts) => p.throw + p.potato + p.kim + p.north
