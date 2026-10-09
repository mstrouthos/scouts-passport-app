import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay } from '../../../../utils/kim'
import { NORTH_SECS, NORTH_BULLSEYE, northError, northPoints, northTarget } from '../../../../utils/north'
import { grant, randomItems } from '../../../utils/funBag'

/** Where my phone pointed when time was up (its magnetic heading), scored here
    against the bearing of the day it was begun on (true north, until each
    day had its own). It must come soon after the start — 3-2-1, the five
    seconds, and a little for the network — or the go is lost. A bullseye puts
    something in the backpack. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ heading?: number, ms?: number }>(event)
  const heading = Number(b?.heading)
  const db = await useDb()
  const day = kimDay()
  const play = (await db.select().from(s.northPlays)).find(p => p.scoutId === me.id && p.day === day)
  if (!play) throw createError({ statusCode: 400, message: 'Πρώτα πάτα «Έτοιμος» 🧭' })
  if (play.answeredAt) throw createError({ statusCode: 409, message: 'Τον σημερινό Βορρά τον έψαξες ήδη — ξανά αύριο! 🧭' })
  const late = Date.now() - Date.parse(play.startedAt) > (3 + NORTH_SECS + 12) * 1000
  const ok = Number.isFinite(heading) && heading >= 0 && heading < 360 && !late
  const error = ok ? northError(heading, northTarget(play.day, me.id)) : 180
  const points = ok ? northPoints(error) : 0
  const ms = Math.max(0, Math.min(NORTH_SECS * 1000, Math.round(Number(b?.ms) || NORTH_SECS * 1000)))
  const done = await db.update(s.northPlays).set({ answeredAt: now(), heading: ok ? heading : null, error, points, ms })
    .where(and(eq(s.northPlays.id, play.id), isNull(s.northPlays.answeredAt))).returning()
  if (!done.length) throw createError({ statusCode: 409, message: 'Τον σημερινό Βορρά τον έψαξες ήδη — ξανά αύριο! 🧭' })
  const won = ok && Math.abs(error) <= NORTH_BULLSEYE ? await grant(me.id, randomItems(1, { tier: 'common' }), 'north', day) : null
  return { error, points, ms, late, won }
})
