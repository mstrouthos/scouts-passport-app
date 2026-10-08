import { and, eq, inArray, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { stillListed } from '../../utils/notifyRetention'
import { potatoTick, activePotato } from '../../utils/leaderFun'
import { bagOf } from '../../utils/funBag'
import { kimDay } from '../../../utils/kim'
import { GAME_KINDS, GAME_OF_KIND, type GameKey } from '../../../utils/games'

/** The dashboard's mini-games, at a glance: what is new in each, where the
    potato is, whether today's tray is done, what is in the backpack. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const news = (await db.select().from(s.notifications).where(and(
    eq(s.notifications.scoutId, me.id), inArray(s.notifications.kind, GAME_KINDS), isNull(s.notifications.readAt), isNull(s.notifications.dismissedAt))))
    .filter(n => stillListed(n))
  const unread: Record<GameKey, number> = { throw: 0, potato: 0, kim: 0, north: 0 }
  for (const n of news) unread[GAME_OF_KIND[n.kind]!]++
  await potatoTick()
  const pot = await activePotato()
  const holder = pot ? (await db.select({ firstName: s.scouts.firstName }).from(s.scouts).where(eq(s.scouts.id, pot.holderId)))[0] : null
  const kim = (await db.select().from(s.kimPlays).where(eq(s.kimPlays.scoutId, me.id))).find(p => p.day === kimDay() && p.answeredAt)
  const bag = Object.values(await bagOf(me.id)).reduce((a, n) => a + n, 0)
  const north = (await db.select().from(s.northPlays).where(eq(s.northPlays.scoutId, me.id))).find(p => p.day === kimDay() && p.answeredAt)
  return {
    unread,
    potato: pot ? { mine: pot.holderId === me.id, holderName: holder?.firstName ?? null } : null,
    kim: kim ? { correct: kim.correct } : null,
    north: north ? { points: north.points, error: north.error } : null,
    bag
  }
})
