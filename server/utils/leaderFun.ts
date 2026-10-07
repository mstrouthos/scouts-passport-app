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
export async function tellFun(to: number, msg: { body: string, refId: number, kind?: string, title?: string }, urgent = false) {
  const db = await useDb()
  const full = { title: msg.title || '🎪 Η παρέα των Βαθμοφόρων', body: msg.body, kind: msg.kind || 'fun', refId: msg.refId }
  const lastHour = new Date(Date.now() - FUN_PUSH_GAP_MS).toISOString()
  const recent = (await db.select().from(s.notifications).where(and(eq(s.notifications.scoutId, to), gt(s.notifications.createdAt, lastHour))))
    .filter(n => ['fun', 'kim', 'potato', 'potato-burst'].includes(n.kind))
  if (isQuietHour() || (!urgent && recent.length))
    await db.insert(s.notifications).values({ scoutId: to, kind: full.kind, refId: full.refId, title: full.title, body: full.body, createdAt: now() })
  else await sendPushTo([to], full)
}

/* ---- the hot potato ----
   A round starts when someone throws it; at that moment a time is drawn for
   it to burst — usually 3 to 30 hours on, now and then (one round in ten)
   sooner, but never in its first half hour, and never between midnight and
   07:00 (which the players are not told) — and kept secret. No moment of a
   round is ever safe. It may be held as long as anyone likes, but whoever has
   it when that moment comes is the one it bursts on: the longer you hold it,
   the likelier that is you. A challenge, drawn from the list the Αρχηγός
   Συστήματος keeps, is told to everyone when the round starts, and falls to
   whoever it bursts on. The Αρχηγός can end a round before it bursts. */

/** The challenges a burst potato hands out, unless the Αρχηγός has written his own. */
export const POTATO_CHALLENGES = [
  'Να κάνει φωνές μαϊμούς μπροστά σε όλους 🐒',
  'Να τραγουδήσει σόλο ένα προσκοπικό τραγούδι στην επόμενη συγκέντρωση 🎤',
  'Να φέρει γλυκά για όλους τους Βαθμοφόρους στην επόμενη συνάντηση 🍪',
  'Να χορέψει τον χορό της κότας μπροστά σε όλους 🐔',
  'Να φορέσει το καπέλο του ανάποδα σε όλη την επόμενη συνάντηση 🧢',
  'Να πει ένα ανέκδοτο μπροστά σε όλους 😂',
  'Να κάνει 20 κάμψεις μπροστά σε όλους 💪',
  'Να κεράσει καφέ τον Αρχηγό ☕',
  'Να μιλάει σαν πειρατής για 10 λεπτά στην επόμενη συνάντηση 🏴‍☠️',
  'Να στήσει μόνος/η του τη σκηνή στην επόμενη εξόρμηση ⛺'
]
export async function potatoChallenges(): Promise<string[]> {
  const db = await useDb()
  const v = (await db.select().from(s.settings).where(eq(s.settings.key, 'potato.challenges')))[0]?.value
  try { const list = JSON.parse(v || 'null'); if (Array.isArray(list) && list.length) return list.map(String) } catch {}
  return POTATO_CHALLENGES
}

const cyHour = (at: Date) => Number(at.toLocaleString('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', hour12: false }))
/** When a round bursts: one time in ten within its first 3 hours (but not
    its first half hour), otherwise 3 to 30 hours on; always at a waking hour
    (07:00–23:59). */
export const POTATO_EARLY_CHANCE = 0.1
export function potatoBurstAt(from = new Date()) {
  const H = 3600_000
  for (let i = 0; i < 500; i++) {
    const after = Math.random() < POTATO_EARLY_CHANCE ? 0.5 * H + Math.random() * 2.5 * H : 3 * H + Math.random() * 27 * H
    const t = new Date(from.getTime() + after)
    const h = cyHour(t)
    if (h >= 7) return t.toISOString()
  }
  return new Date(from.getTime() + 24 * 3600_000).toISOString()
}
/** The potato in play, if one is. */
export async function activePotato() {
  const db = await useDb()
  return (await db.select().from(s.hotPotato).where(isNull(s.hotPotato.endedAt)))[0] || null
}
/** Everyone who should hear of a round: the active Βαθμοφόροι who have not left the fun. */
async function potatoAudience() {
  const db = await useDb()
  return (await db.select().from(s.scouts))
    .filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && !r.isHidden && r.funPref !== 'off').map(r => r.id)
}
/** A new round: everyone is told what the one it bursts on will have to do
    (the first holder hears it with the throw itself). */
export async function announcePotato(p: { id: number, holderId: number, startedBy: number, challenge: string | null }, starter: string) {
  for (const id of (await potatoAudience()).filter(x => x !== p.holderId && x !== p.startedBy)) {
    await tellFun(id, { title: '🥔 Νέος γύρος καυτής πατάτας!', kind: 'potato', refId: p.id,
      body: `${starter} ξεκίνησε μια καυτή πατάτα! Όποιον σκάσει: «${p.challenge || '—'}»` }, true)
  }
}
/** If its moment has come, the potato bursts in its holder's hands: the
    round ends, the feed says so, and everyone hears who must now do the
    challenge. Called by the cron and whenever the playground is looked at. */
export async function potatoTick() {
  const db = await useDb()
  let p = await activePotato()
  if (!p) return null
  // a round from before there were challenges: it draws one now, and everyone hears it
  if (!p.challenge) {
    const list = await potatoChallenges()
    const challenge = list[Math.floor(Math.random() * list.length)]
    const set = await db.update(s.hotPotato).set({ challenge }).where(and(eq(s.hotPotato.id, p.id), isNull(s.hotPotato.challenge))).returning()
    if (set.length) {
      p = set[0]
      const starter = (await db.select().from(s.scouts).where(eq(s.scouts.id, p.startedBy)).limit(1))[0]
      await announcePotato({ ...p, startedBy: -1, holderId: -1 }, starter?.firstName ?? '—')
    }
  }
  if (Date.parse(p.deadline) > Date.now()) return null
  // ended only once, even if two of these run together
  const done = await db.update(s.hotPotato).set({ endedAt: now(), burnedId: p.holderId })
    .where(and(eq(s.hotPotato.id, p.id), isNull(s.hotPotato.endedAt))).returning()
  if (!done.length) return null
  await db.insert(s.leaderFun).values({ fromId: p.holderId, toId: p.holderId, action: 'burn', createdAt: now(), auto: true })
  const who = (await db.select().from(s.scouts).where(eq(s.scouts.id, p.holderId)).limit(1))[0]
  for (const id of await potatoAudience()) {
    await tellFun(id, {
      title: '💥 Η καυτή πατάτα έσκασε!', kind: 'potato-burst', refId: p.id,
      body: id === p.holderId
        ? `Έσκασε στα χέρια σου (πάσες: ${p.passes})!` + (p.challenge ? ` Η πρόκλησή σου: «${p.challenge}»` : '')
        : `Έσκασε στα χέρια: ${who?.firstName ?? '—'} (πάσες: ${p.passes})!` + (p.challenge ? ` Η πρόκληση: «${p.challenge}»` : '')
    }, true)
  }
  return 'burst'
}
/** The Αρχηγός ends a round before it bursts: nobody gets the challenge. */
export async function stopPotato(byId: number) {
  const db = await useDb()
  const p = await activePotato()
  if (!p) return false
  await db.update(s.hotPotato).set({ endedAt: now(), stoppedBy: byId }).where(and(eq(s.hotPotato.id, p.id), isNull(s.hotPotato.endedAt)))
  return true
}

/** Who plays the potato: every active Βαθμοφόρος who takes everything. */
export async function potatoPool() {
  const db = await useDb()
  return (await db.select().from(s.scouts))
    .filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && !r.isHidden && r.funPref === 'all').map(r => r.id)
}
/** Who has held it this round. */
export const potatoCycle = (p: { cycle: string | null }) => { try { return (JSON.parse(p.cycle || '[]') as number[]) } catch { return [] } }
/** Whom the holder may pass it to: anyone who has not had it this round —
    and when there is no one left (someone has since dropped out), anyone. */
export function potatoTargets(pool: number[], cycle: number[], holder: number) {
  const fresh = pool.filter(id => id !== holder && !cycle.includes(id))
  return fresh.length ? fresh : pool.filter(id => id !== holder)
}
