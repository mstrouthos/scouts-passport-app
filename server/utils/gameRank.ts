import { and, gte, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { FUN_ACTIONS } from '../../utils/fun'
import { kimDay } from '../../utils/kim'
import { GAME_RANK } from '../../utils/games'
import type { GameKey } from '../../utils/games'

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

  // Σπλατς: everything done by hand (the daily limit keeps it at most 20 a day);
  // the potato: every throw of it
  const plays = new Set(FUN_ACTIONS.map(a => a.key))
  const fun = await db.select().from(s.leaderFun).where(gte(s.leaderFun.createdAt, sinceIso))
  for (const r of fun) {
    if (r.action === 'potato') { if (r.outcome !== 'forced') add(r.fromId, 'potato', GAME_RANK.potatoPass) }
    else if (plays.has(r.action) && !r.auto) add(r.fromId, 'throw', GAME_RANK.splat)
  }
  // a round that burst: everyone who held it, but the one it burst on
  const rounds = (await db.select().from(s.hotPotato).where(and(isNotNull(s.hotPotato.burnedId), gte(s.hotPotato.endedAt, sinceIso))))
  if (rounds.length) {
    const from = rounds.reduce((m, p) => p.startedAt < m ? p.startedAt : m, rounds[0]!.startedAt)
    const throws = (await db.select().from(s.leaderFun).where(gte(s.leaderFun.createdAt, from))).filter(r => r.action === 'potato')
    for (const p of rounds) {
      const held = new Set<number>()
      for (const r of throws) if (r.createdAt >= p.startedAt && r.createdAt <= p.endedAt!) { held.add(r.fromId); held.add(r.toId) }
      held.delete(p.burnedId!)
      for (const id of held) add(id, 'potato', GAME_RANK.potatoSurvive)
    }
  }
  // Κιμ: every thing remembered; Βορράς: its own points
  for (const k of (await db.select().from(s.kimPlays)).filter(k => k.day >= sinceDay && k.answeredAt)) add(k.scoutId, 'kim', (k.correct || 0) * GAME_RANK.kimPerThing)
  for (const n of (await db.select().from(s.northPlays)).filter(n => n.day >= sinceDay && n.answeredAt)) add(n.scoutId, 'north', n.points || 0)
  return out
}
export const totalOf = (p: Parts) => p.throw + p.potato + p.kim + p.north
