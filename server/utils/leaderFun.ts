import { and, eq, gt, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { now } from './passcode'
import { sendPushTo } from './push'

/** How much fun a day holds: enough for a laugh, never a flood. */
export const FUN_LIMIT_DAY = 10
/** …and at most this many at any one person in a day */
export const FUN_PER_TARGET_DAY = 3
/** The same thing at the same person again only after a short breath. */
export const FUN_COOLDOWN_MS = 20_000
/** No buzzing phones at night (Cyprus time): it waits in the bell instead. */
export const isQuietHour = (at = new Date()) => {
  const h = Number(at.toLocaleString('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', hour12: false }))
  return h >= 22 || h < 8
}
/** The start of today in Cyprus, as an ISO instant. */
export function cyprusDayStart(at = new Date()) {
  const day = at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  // Cyprus is UTC+2 or +3; the earlier bound keeps "today" whole either way
  return new Date(Date.parse(`${day}T00:00:00Z`) - 3 * 3600_000).toISOString()
}
/** The start of this week (Monday) in Cyprus. */
export function cyprusWeekStart(at = new Date()) {
  const day = at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  const dow = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7          // Monday = 0
  return cyprusDayStart(new Date(Date.parse(`${day}T12:00:00Z`) - dow * 86400_000))
}

/** A phone buzzes for the first in an hour; the rest wait in the bell. */
export const FUN_PUSH_GAP_MS = 60 * 60_000

/** Whether the Αρχηγός Συστήματος has paused the playground. */
export async function funPaused() {
  const db = await useDb()
  return (await db.select().from(s.settings).where(eq(s.settings.key, 'fun.paused')))[0]?.value === '1'
}

/** Tell a Βαθμοφόρος what was done to them. Their phone buzzes only for the
    first in an hour and never at night; the rest go quietly into the bell.
    `urgent` (the potato: it has a clock) buzzes past the hourly gap, but
    still never at night. */
export async function tellFun(to: number, msg: { body: string, refId: number }, urgent = false) {
  const db = await useDb()
  const full = { title: '🎪 Η παρέα των Βαθμοφόρων', body: msg.body, kind: 'fun', refId: msg.refId }
  const lastHour = new Date(Date.now() - FUN_PUSH_GAP_MS).toISOString()
  const recent = (await db.select().from(s.notifications).where(and(eq(s.notifications.scoutId, to), gt(s.notifications.createdAt, lastHour))))
    .filter(n => n.kind === 'fun')
  if (isQuietHour() || (!urgent && recent.length))
    await db.insert(s.notifications).values({ scoutId: to, kind: full.kind, refId: full.refId, title: full.title, body: full.body, createdAt: now() })
  else await sendPushTo([to], full)
}

/* ---- the hot potato ---- */
/** How long a holder has, counted in waking hours only. */
export const POTATO_MS = 4 * 3600_000
/** When the potato burns if it is not passed: four hours on, the clock
    stopped between 22:00 and 08:00. */
export function potatoDeadline(from = new Date()) {
  const STEP = 5 * 60_000
  let t = from.getTime(), left = POTATO_MS
  for (let i = 0; i < 2000 && left > 0; i++) {
    if (!isQuietHour(new Date(t))) left -= STEP
    t += STEP
  }
  return new Date(t).toISOString()
}
/** The potato in play, if one is. */
export async function activePotato() {
  const db = await useDb()
  return (await db.select().from(s.hotPotato).where(isNull(s.hotPotato.endedAt)))[0] || null
}
/** If the potato's time is up, it burns in its holder's hands: the round
    ends, the feed says so, the holder is told. Called by the cron and
    whenever the playground is looked at. An hour before, the holder is warned. */
export async function potatoTick() {
  const db = await useDb()
  const p = await activePotato()
  if (!p) return null
  const t = Date.now()
  if (Date.parse(p.deadline) <= t) {
    // ended only once, even if two of these run together
    const done = await db.update(s.hotPotato).set({ endedAt: now(), burnedId: p.holderId })
      .where(and(eq(s.hotPotato.id, p.id), isNull(s.hotPotato.endedAt))).returning()
    if (!done.length) return null
    const [row] = await db.insert(s.leaderFun).values({ fromId: p.holderId, toId: p.holderId, action: 'burn', createdAt: now(), auto: true }).returning()
    await tellFun(p.holderId, { body: `🔥 Η καυτή πατάτα κάηκε στα χέρια σου, μετά από ${p.passes} πάσες!`, refId: row.id }, true)
    return 'burned'
  }
  if (!p.warned && Date.parse(p.deadline) - t < 3600_000 && !isQuietHour()) {
    await db.update(s.hotPotato).set({ warned: true }).where(eq(s.hotPotato.id, p.id))
    // its own kind: a push is sent once per kind and reference, and the pass
    // that brought the potato has already been told
    await sendPushTo([p.holderId], { title: '🥔 Η πατάτα καίει!', body: '⏰ Μία ώρα έμεινε για να πετάξεις την καυτή πατάτα σε κάποιον άλλον!', kind: 'fun-warn', refId: p.id * 1000 + p.passes })
    return 'warned'
  }
  return null
}
