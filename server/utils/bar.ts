import type { H3Event } from 'h3'
import { eq, and, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, rankOf, scopedSectionIds, type SessionScout } from './guard'
import { QUIZ_SLUG } from './quizSector'

export type BarStaff = typeof s.barStaff.$inferSelect
export type BarOrder = typeof s.barOrders.$inferSelect

/** A member of the bar crew, signed in with their crew code. The code names
    the event too, so nothing else has to be chosen on the night. */
export async function requireBarStaff(event: H3Event, roles?: BarStaff['role'][]): Promise<BarStaff> {
  const session = await getUserSession(event)
  const id = (session as any)?.bar?.staffId
  if (!id) throw createError({ statusCode: 401, message: 'Not signed in' })
  const db = await useDb()
  const row = (await db.select().from(s.barStaff).where(eq(s.barStaff.id, id)).limit(1))[0]
  if (!row || !row.isActive) throw createError({ statusCode: 401, message: 'Not signed in' })
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, row.eventId)).limit(1))[0]
  if (!ev || ev.status !== 'open') throw createError({ statusCode: 401, message: 'Η εκδήλωση έκλεισε' })
  if (roles && !roles.includes(row.role)) throw createError({ statusCode: 403, message: 'Not your job' })
  return row
}

/** The Αρχηγός Συστήματος runs the bar's setup; the Αρχηγός of the Ομάδα
    reads its figures alongside them, changing nothing. */
export async function canReadBar(me: SessionScout) {
  if (me.role === 'troop_leader') return true
  if ((await rankOf(me)) !== 'archigos') return false
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return true
  const db = await useDb()
  const omada = (await db.select().from(s.sections)).find(x => x.slug === QUIZ_SLUG)
  return !!omada && secIds.includes(omada.id)
}
export async function requireBarReader(event: H3Event) {
  const me = await requireScout(event)
  if (!(await canReadBar(me))) throw createError({ statusCode: 403, message: 'Not for you' })
  return me
}
export async function requireBarAdmin(event: H3Event) {
  const me = await requireScout(event)
  if (me.role !== 'troop_leader') throw createError({ statusCode: 403, message: 'Troop leader only' })
  return me
}

/** A six-digit crew code nobody else holds. */
export async function newStaffCode() {
  const db = await useDb()
  const taken = new Set((await db.select({ code: s.barStaff.code }).from(s.barStaff)).map(x => x.code))
  for (let i = 0; i < 50; i++) {
    const c = String(Math.floor(100000 + Math.random() * 900000))
    if (!taken.has(c)) return c
  }
  throw createError({ statusCode: 500, message: 'Could not make a code' })
}

/** Orders with their lines, newest last. */
export async function ordersWithItems(where: any) {
  const db = await useDb()
  const orders = (await db.select().from(s.barOrders).where(where)).sort((a, b) => a.number - b.number)
  if (!orders.length) return []
  const items = await db.select().from(s.barOrderItems).where(inArray(s.barOrderItems.orderId, orders.map(o => o.id)))
  const staff = await db.select().from(s.barStaff).where(eq(s.barStaff.eventId, orders[0].eventId))
  const accounts = await db.select().from(s.barAccounts).where(eq(s.barAccounts.eventId, orders[0].eventId))
  const nameOf = (id: number | null) => staff.find(x => x.id === id)?.name ?? null
  return orders.map(o => ({
    ...o,
    waiterName: nameOf(o.waiterId), bartenderName: nameOf(o.bartenderId),
    accountName: accounts.find(a => a.id === o.accountId)?.name ?? null,
    items: items.filter(i => i.orderId === o.id),
    // settled once a cashier has taken the money, whatever kind
    settled: !!o.paidAt
  }))
}

/** The floor plan. Positions are fractions of the plan's width and height,
    so the same plan fits any phone. */
export type Layout = { tables: Array<{ no: number; x: number; y: number }>; marks: Array<{ id: string; label: string; x: number; y: number }>; seats: Record<string, number>; kidSeats: Record<string, number> }
const seatMap = (o: any) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {})
  .map(([k, v]) => [String(Number(k)), Math.max(0, Math.min(99, Math.floor(Number(v)) || 0))]).filter(([k]) => k !== 'NaN'))
export function parseLayout(raw: string | null): Layout | null {
  if (!raw) return null
  try {
    const j = JSON.parse(raw)
    const f = (v: any) => Math.min(1, Math.max(0, Number(v) || 0))
    return {
      tables: (Array.isArray(j.tables) ? j.tables : []).map((t: any) => ({ no: Number(t.no), x: f(t.x), y: f(t.y) })).filter((t: any) => Number.isInteger(t.no) && t.no > 0),
      marks: (Array.isArray(j.marks) ? j.marks : []).slice(0, 20).map((m: any) => ({ id: String(m.id || '').slice(0, 20), label: String(m.label || '').slice(0, 24), x: f(m.x), y: f(m.y) })).filter((m: any) => m.label),
      // how many are booked at each table, by table number: adults, and children
      seats: seatMap(j.seats),
      kidSeats: seatMap(j.kidSeats)
    }
  } catch { return null }
}

/** Each table's coupons: handed out at the door (adults admitted × the
    event's rate), used on its live orders, and what is left. */
export async function couponBalances(eventId: number) {
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, eventId)))[0]
  const rate = ev?.couponsPerAdult ?? 1
  const arrivals = await db.select().from(s.barArrivals).where(eq(s.barArrivals.eventId, eventId))
  const orders = (await db.select().from(s.barOrders).where(eq(s.barOrders.eventId, eventId))).filter(o => o.status !== 'cancelled')
  const items = orders.length ? await db.select().from(s.barOrderItems).where(inArray(s.barOrderItems.orderId, orders.map(o => o.id))) : []
  const out: Record<number, { issued: number; used: number; left: number }> = {}
  for (let no = 1; no <= (ev?.tableCount || 0); no++) out[no] = { issued: 0, used: 0, left: 0 }
  for (const a of arrivals) if (out[a.tableNo]) out[a.tableNo].issued += a.count * rate
  for (const o of orders) for (const i of items.filter(i => i.orderId === o.id)) if (out[o.tableNo]) out[o.tableNo].used += i.couponQty * i.couponCost
  for (const t of Object.values(out)) t.left = t.issued - t.used
  return out
}

export type PayKind = 'cash' | 'card' | 'coupon'
export const PAY_KINDS: PayKind[] = ['cash', 'card', 'coupon']
export const acceptsOf = (st: { accepts: string }) => st.accepts.split(',').map(x => x.trim()).filter(x => PAY_KINDS.includes(x as PayKind)) as PayKind[]

/** Tell the cashiers who take this kind of money that an order is waiting. */
export async function notifyCashiers(eventId: number, o: { number: number; tableNo: number; totalCents: number; paidMethod: string | null }, waiterName: string) {
  const db = await useDb()
  const cashiers = (await db.select().from(s.barStaff).where(eq(s.barStaff.eventId, eventId)))
    .filter(x => x.isActive && x.role === 'cashier' && o.paidMethod && acceptsOf(x).includes(o.paidMethod as PayKind))
  if (!cashiers.length) return
  const { sendPushToBarStaff } = await import('./push')
  const kind = ({ cash: 'Μετρητά', card: 'Κάρτα', coupon: 'Κουπόνια' } as any)[o.paidMethod!]
  await sendPushToBarStaff(cashiers.map(c => c.id), {
    title: `💶 Προς πληρωμή #${o.number} · Τραπέζι ${o.tableNo}`,
    body: `${kind} · ${(o.totalCents / 100).toFixed(2).replace('.', ',')} € — ${waiterName}`
  }).catch(err => console.error('[bar] cashier push failed', err))
}

export { and, eq }
