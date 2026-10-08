import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireLeader, requireScout, sectionOf, type SessionScout } from './guard'

/* The shop (schema: shopItems, shopEntries). Who sees what it sells and for
   how much is the Αρχηγός Συστήματος's choice (the Βαθμοφόροι, and the
   members of any κλάδος); only those who run it — whom the Αρχηγός Συστήματος
   names — keep its items and its till. */

export const isShopManager = (me: SessionScout) => me.role !== 'scout' && !!me.shopManager

/** The signed-in Βαθμοφόρος, if they run the shop — or 403. */
export async function requireShopManager(event: H3Event) {
  const me = await requireLeader(event)
  if (!isShopManager(me)) throw createError({ statusCode: 403, message: 'Μόνο ο υπεύθυνος του καταστήματος' })
  return me
}

/* ---- who sees the shop ---- */
export type Audience = { leaders: boolean, sections: number[] }
const AUDIENCE_KEY = 'shop.audience'
/** Who sees the shop: the Βαθμοφόροι unless set otherwise, and the members
    of the κλάδοι named. */
export async function shopAudienceOf(): Promise<Audience> {
  const db = await useDb()
  const raw = (await db.select().from(s.settings).where(eq(s.settings.key, AUDIENCE_KEY)))[0]?.value
  try {
    const a = raw ? JSON.parse(raw) : null
    if (a) return { leaders: a.leaders !== false, sections: (Array.isArray(a.sections) ? a.sections : []).map(Number).filter(Number.isInteger) }
  } catch {}
  return { leaders: true, sections: [] }
}
export async function setShopAudience(a: Audience) {
  const value = JSON.stringify({ leaders: !!a.leaders, sections: [...new Set(a.sections.map(Number).filter(Number.isInteger))] })
  await (await useDb()).insert(s.settings).values({ key: AUDIENCE_KEY, value })
    .onConflictDoUpdate({ target: s.settings.key, set: { value } })
}
/** Whether this person sees the shop. Whoever runs it always does, and so
    does the Αρχηγός Συστήματος, who decides who else does. */
export async function canSeeShop(me: SessionScout, audience?: Audience): Promise<boolean> {
  if (me.role === 'troop_leader' || isShopManager(me)) return true
  const a = audience ?? await shopAudienceOf()
  if (me.role !== 'scout') return a.leaders
  const sec = await sectionOf(me)
  return sec != null && a.sections.includes(sec)
}
/** The signed-in person, if they may see the shop — or 403. */
export async function requireShopViewer(event: H3Event, leadersOnly = false) {
  const me = leadersOnly ? await requireLeader(event) : await requireScout(event)
  if (!await canSeeShop(me)) throw createError({ statusCode: 403, message: 'Το κατάστημα δεν είναι ανοιχτό για σένα' })
  return me
}

/* ---- an item's pictures: file ids, the first its cover ---- */
export type ShopItemRow = typeof s.shopItems.$inferSelect
export function imagesOf(i: Pick<ShopItemRow, 'images'>): number[] {
  try { const a = i.images ? JSON.parse(i.images) : []; return Array.isArray(a) ? a.map(Number).filter(Number.isInteger) : [] } catch { return [] }
}
export const shopImageUrl = (fileId: number) => `/api/shop-image/${fileId}`
/** An item as it is shown: what everyone sees, and for its manager whether
    it is hidden and how many are left. */
export function shopItemView(i: ShopItemRow, counting: boolean) {
  const imgs = imagesOf(i)
  return {
    id: i.id, name: i.name, description: i.description, priceCents: i.priceCents,
    stock: counting ? i.stock : null, visible: i.visible, sortOrder: i.sortOrder,
    images: imgs.map(id => ({ id, url: shopImageUrl(id) }))
  }
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

/** At most this many pictures for an item. */
export const SHOP_MAX_IMAGES = 8
