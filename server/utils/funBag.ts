import { and, eq, gt, sql } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { now } from './passcode'
import { ITEM_TIER, THROWABLES, BAG_MAX, REFILL, REFILL_HOURS, WELCOME, funAction, type Tier } from '../../utils/fun'
import { sendPushTo } from './push'
import { kimDay } from '../../utils/kim'

/* The backpack 🎒 (utils/fun.ts): throwables come in a refill at 06:00 and
   15:00, more are earned in the games, and each throw spends one. */

export type Items = Record<string, number>

/** What is in someone's backpack. */
export async function bagOf(scoutId: number): Promise<Items> {
  const db = await useDb()
  const rows = await db.select().from(s.funBag).where(eq(s.funBag.scoutId, scoutId))
  return Object.fromEntries(rows.filter(r => r.qty > 0).map(r => [r.item, r.qty]))
}
const total = (b: Items) => Object.values(b).reduce((n, x) => n + x, 0)

/** Put things in someone's backpack, once for this reason and reference —
    whatever does not fit (BAG_MAX) is let go. Returns what went in, or null
    if this was already given. */
export async function grant(scoutId: number, items: Items, reason: string, ref: string): Promise<Items | null> {
  const db = await useDb()
  const room = Math.max(0, BAG_MAX - total(await bagOf(scoutId)))
  const given: Items = {}
  let left = room
  for (const [k, n] of Object.entries(items)) {
    if (!THROWABLES.includes(k) || n <= 0 || left <= 0) continue
    given[k] = Math.min(n, left); left -= given[k]
  }
  const [row] = await db.insert(s.funGrants).values({ scoutId, items: JSON.stringify(given), reason, ref, createdAt: now() })
    .onConflictDoNothing().returning()
  if (!row) return null
  for (const [k, n] of Object.entries(given)) {
    await db.insert(s.funBag).values({ scoutId, item: k, qty: n })
      .onConflictDoUpdate({ target: [s.funBag.scoutId, s.funBag.item], set: { qty: sql`${s.funBag.qty} + ${n}` } })
  }
  return given
}

/** Take one thing out to throw it; false if there is none. */
export async function take(scoutId: number, item: string): Promise<boolean> {
  const db = await useDb()
  const done = await db.update(s.funBag).set({ qty: sql`${s.funBag.qty} - 1` })
    .where(and(eq(s.funBag.scoutId, scoutId), eq(s.funBag.item, item), gt(s.funBag.qty, 0))).returning()
  return done.length > 0
}

/** The welcome pack, the first time. */
export async function dailyBag(scoutId: number) {
  await grant(scoutId, WELCOME, 'welcome', '1')
}

/** The refill (REFILL, at REFILL_HOURS, Cyprus time): for every Βαθμοφόρος,
    once for each — the latest that has come today, never one missed before
    it (so a deploy at 15:04 gives the 15:00 one, not the 06:00 as well).
    Those who play are told; whoever has opted out of the games is filled
    but not told. At 06:00 nobody's phone buzzes: it waits for the morning
    bundle at 08:00. Run by the cron. */
export async function refillTick(at = new Date()): Promise<{ slot: string, given: number, told: number } | null> {
  const hour = Number(at.toLocaleString('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', hour12: false }))
  const slot = [...REFILL_HOURS].sort((a, b) => b - a).find(h => hour >= h)
  if (slot == null) return null
  const day = kimDay(at), ref = `${day}@${slot}`
  const db = await useDb()
  const people = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt)
  // one message for each different refill (a backpack near full takes less)
  const byBody = new Map<string, number[]>()
  let given = 0
  for (const p of people) {
    const got = await grant(p.id, REFILL, 'refill', ref)
    if (!got || !Object.keys(got).length) continue
    given++
    if (p.funPref === 'off') continue
    const body = `🎒 Ανεφοδιασμός! ${Object.entries(got).map(([k, n]) => `${n} ${funAction(k)?.emoji || k}`).join(' · ')} στο σακίδιό σου. Ώρα για Σπλατς!`
    byBody.set(body, [...(byBody.get(body) || []), p.id])
  }
  const refId = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400_000) * 2 + (slot >= 12 ? 1 : 0)
  const msg = (body: string) => ({ title: '🍅 Σπλατς', body, kind: 'fun-refill', refId })
  let told = 0
  for (const [body, ids] of byBody) {
    told += ids.length
    if (slot < 8) {
      // into each one's Σπλατς 🔔 now; their phone hears of it in the 08:00 bundle
      await db.insert(s.notifications).values(ids.map(id => ({ scoutId: id, kind: 'fun-refill', refId, title: msg(body).title, body, createdAt: now() })))
    } else await sendPushTo(ids, msg(body))
  }
  return { slot: ref, given, told }
}

/** Things drawn at random: mostly common, now and then the rare one. */
export function randomItems(n: number, opts: { tier?: Tier, rareChance?: number } = {}): Items {
  const byTier = (t: Tier) => THROWABLES.filter(k => ITEM_TIER[k] === t)
  const out: Items = {}
  for (let i = 0; i < n; i++) {
    let tier: Tier = opts.tier || 'common'
    if (!opts.tier) {
      const r = Math.random()
      tier = r < (opts.rareChance ?? 0.05) ? 'rare' : r < 0.3 ? 'uncommon' : 'common'
    }
    const pool = byTier(tier)
    const k = pool[Math.floor(Math.random() * pool.length)]
    out[k] = (out[k] || 0) + 1
  }
  return out
}
export const addItems = (a: Items, b: Items) => {
  const out = { ...a }
  for (const [k, n] of Object.entries(b)) out[k] = (out[k] || 0) + n
  return out
}

/** What they were given and have not seen yet, as the toasts to show. */
export async function unseenGrants(scoutId: number) {
  const db = await useDb()
  return (await db.select().from(s.funGrants).where(and(eq(s.funGrants.scoutId, scoutId), eq(s.funGrants.seen, false))))
    .map(g => ({ id: g.id, reason: g.reason, items: JSON.parse(g.items) as Items }))
    // the day's free tomatoes go without saying; a tray's prize was shown on the tray
    .filter(g => Object.keys(g.items).length && g.reason !== 'daily' && g.reason !== 'kim')
}
