import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireLeader, type SessionScout } from './guard'

/* The shop (schema: shopItems, shopEntries). Every Βαθμοφόρος sees what it
   sells and for how much; only those who run it — set by the Αρχηγός
   Συστήματος — keep its items and its till. */

export const isShopManager = (me: SessionScout) => me.role !== 'scout' && !!me.shopManager

/** The signed-in Βαθμοφόρος, if they run the shop — or 403. */
export async function requireShopManager(event: H3Event) {
  const me = await requireLeader(event)
  if (!isShopManager(me)) throw createError({ statusCode: 403, message: 'Μόνο ο υπεύθυνος του καταστήματος' })
  return me
}

export type Entry = typeof s.shopEntries.$inferSelect

/** What each line does to the till: a payment in, money out, cash taken to
    the bank (out of the cash, into the bank), or what a count found. */
export function effectOf(e: Pick<Entry, 'kind' | 'method' | 'amountCents'>): { cash: number, bank: number } {
  const on = (m: string | null, n: number) => ({ cash: m === 'cash' ? n : 0, bank: m === 'bank' ? n : 0 })
  if (e.kind === 'payment') return on(e.method, e.amountCents)
  if (e.kind === 'expense') return on(e.method, -e.amountCents)
  if (e.kind === 'deposit') return { cash: -e.amountCents, bank: e.amountCents }
  if (e.kind === 'count') return on(e.method, e.amountCents)
  return { cash: 0, bank: 0 }
}

/** The till now: every line that was not cancelled. */
export async function tillOf(entries?: Entry[]) {
  const list = entries ?? await (await useDb()).select().from(s.shopEntries)
  let cash = 0, bank = 0
  for (const e of list) if (!e.voidedAt) { const x = effectOf(e); cash += x.cash; bank += x.bank }
  return { cash, bank }
}

/** Whether the shop counts what it has (off unless its manager turns it on):
    off, items carry no stock, and a sale takes nothing off the shelf. */
export async function trackStock() {
  const db = await useDb()
  return (await db.select().from(s.settings).where(eq(s.settings.key, 'shop.trackStock')))[0]?.value === '1'
}
export async function setTrackStock(on: boolean) {
  const db = await useDb()
  await db.insert(s.settings).values({ key: 'shop.trackStock', value: on ? '1' : '0' })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: on ? '1' : '0' } })
}

/** A sum of money as sent: euros (12.5 or "12,50") into whole cents. */
export function centsOf(v: unknown): number | null {
  const n = Number(String(v ?? '').trim().replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}
