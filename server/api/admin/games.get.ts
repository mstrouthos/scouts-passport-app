import { and, eq, inArray, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { stillListed } from '../../utils/notifyRetention'
import { potatoTick, activePotato, potatoWaiting } from '../../utils/leaderFun'
import { activePhotoRound } from '../../utils/photoGame'
import { photoThing } from '../../../utils/photoGame'
import { bagOf } from '../../utils/funBag'
import { kimDay } from '../../../utils/kim'
import { GAME_KINDS, GAME_OF_KIND, type GameKey } from '../../../utils/games'
import { gameScores, totalOf } from '../../utils/gameRank'
import { shortName } from '../../../utils/shortName'
import { sunTimes } from '../../../utils/sun'
import { cyprusWeekStart } from '../../utils/leaderFun'

/** The dashboard's mini-games, at a glance: what is new in each, where the
    potato is, whether today's tray is done, what is in the backpack. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const news = (await db.select().from(s.notifications).where(and(
    eq(s.notifications.scoutId, me.id), inArray(s.notifications.kind, GAME_KINDS), isNull(s.notifications.readAt), isNull(s.notifications.dismissedAt))))
    .filter(n => stillListed(n))
  const unread: Record<GameKey, number> = { throw: 0, potato: 0, kim: 0, north: 0, flag: 0, photo: 0 }
  for (const n of news) unread[GAME_OF_KIND[n.kind]!]++
  await potatoTick()
  const pot = await activePotato()
  const holder = pot ? (await db.select({ firstName: s.scouts.firstName, lastName: s.scouts.lastName }).from(s.scouts).where(eq(s.scouts.id, pot.holderId)))[0] : null
  const kim = (await db.select().from(s.kimPlays).where(eq(s.kimPlays.scoutId, me.id))).find(p => p.day === kimDay() && p.answeredAt)
  const bag = Object.values(await bagOf(me.id)).reduce((a, n) => a + n, 0)
  // the flag today: is it up, is it time
  const flagRow = (await db.select().from(s.flagDays).where(eq(s.flagDays.day, kimDay())))[0]
  const sun = sunTimes(kimDay()), tNow = Date.now()
  const flag = { sunrise: sun.rise, sunset: sun.set, up: !!flagRow?.raisedBy && !flagRow?.loweredBy, raised: !!flagRow?.raisedBy, lowered: !!flagRow?.loweredBy,
    phase: tNow < Date.parse(sun.rise) ? 'before' : tNow < Date.parse(sun.set) ? 'day' : 'evening' }
  const north = (await db.select().from(s.northPlays).where(eq(s.northPlays.scoutId, me.id))).find(p => p.day === kimDay() && p.answeredAt)
  // where I stand this week across all the games
  const week = [...(await gameScores(cyprusWeekStart())).entries()].map(([id, p]) => ({ id, total: totalOf(p) })).filter(x => x.total > 0)
  const mineTotal = week.find(x => x.id === me.id)?.total ?? 0
  return {
    rank: { total: mineTotal, place: mineTotal ? 1 + week.filter(x => x.total > mineTotal).length : null, of: week.length },
    unread,
    potato: pot ? { mine: pot.holderId === me.id, holderName: shortName(holder) || null } : null,
    potatoWaiting: pot ? null : await potatoWaiting(),
    // the photo game, only for those let in while it is tried out — admins too switch it on for
    // themselves in Ρόλοι; everyone else sees it coming soon, greyed out, not a link
    photo: me.role !== 'scout' ? await (async () => { const r = await activePhotoRound(); const t = r ? photoThing(r.thing) : null; return { round: t ? { el: t.el, emoji: t.emoji } : null } })() : null,
    kim: kim ? { correct: kim.correct } : null,
    north: north ? { points: north.points, error: north.error } : null,
    flag,
    bag
  }
})
