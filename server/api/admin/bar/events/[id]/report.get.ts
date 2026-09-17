import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { requireBarReader, ordersWithItems, parseLayout } from '../../../../../utils/bar'

/** The night in numbers: takings, what sold, which tables, who served, how
    fast the bar was. Kept for the next event's planning. */
export default defineEventHandler(async (event) => {
  await requireBarReader(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const all = await ordersWithItems(eq(s.barOrders.eventId, id))
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, id)))[0]
  const arrivals = await db.select().from(s.barArrivals).where(eq(s.barArrivals.eventId, id))
  const accountsAll = await db.select().from(s.barAccounts).where(eq(s.barAccounts.eventId, id))
  const lay = parseLayout(ev?.layout ?? null)
  const seats = lay?.seats || {}, kidSeats = lay?.kidSeats || {}
  // the door: booked vs arrived per table, extras, and the ticket money apart from the bar's
  const doorTables = Array.from({ length: ev?.tableCount || 0 }, (_, i) => i + 1).map(no => {
    const booked = seats[String(no)] || 0, kidsBooked = kidSeats[String(no)] || 0
    const mine = arrivals.filter(a => a.tableNo === no)
    const arrived = mine.reduce((s, a) => s + a.count, 0), kidsArrived = mine.reduce((s, a) => s + a.kids, 0)
    return { no, booked, arrived, extra: Math.max(0, arrived - booked), kidsBooked, kidsArrived, kidsExtra: Math.max(0, kidsArrived - kidsBooked) }
  }).filter(t => t.booked || t.arrived || t.kidsBooked || t.kidsArrived)
  const ticket = ev?.entranceCents || 0
  const doorCents = (xs: typeof arrivals) => xs.reduce((s, a) => s + a.count * ticket, 0)
  const door = {
    ticketCents: ticket,
    booked: doorTables.reduce((s, t) => s + t.booked, 0),
    arrived: doorTables.reduce((s, t) => s + t.arrived, 0),
    extra: doorTables.reduce((s, t) => s + t.extra, 0),
    kidsBooked: doorTables.reduce((s, t) => s + t.kidsBooked, 0),
    kidsArrived: doorTables.reduce((s, t) => s + t.kidsArrived, 0),
    kidsExtra: doorTables.reduce((s, t) => s + t.kidsExtra, 0),
    cents: doorCents(arrivals.filter(a => a.method === 'cash' || a.confirmedAt)),
    cashCents: doorCents(arrivals.filter(a => a.method === 'cash')),
    cardCents: doorCents(arrivals.filter(a => a.method === 'card' && a.confirmedAt)),
    cardPendingCents: doorCents(arrivals.filter(a => a.method === 'card' && !a.confirmedAt)),
    accounts: accountsAll.map(a => ({ label: a.name, people: arrivals.filter(x => x.accountId === a.id).reduce((s, x) => s + x.count, 0), cents: doorCents(arrivals.filter(x => x.accountId === a.id)) })).filter(a => a.people),
    tables: doorTables
  }
  const staff = await db.select().from(s.barStaff).where(eq(s.barStaff.eventId, id))
  const live = all.filter(o => o.status !== 'cancelled')
  const sum = (xs: typeof live) => xs.reduce((a, o) => a + o.totalCents, 0)
  const paid = live.filter(o => o.settled)
  const tally = <K extends string | number>(key: (o: typeof live[number]) => K, label: (k: K) => string) => {
    const m = new Map<K, { label: string; orders: number; cents: number; paidCents: number }>()
    for (const o of live) {
      const k = key(o); const r = m.get(k) || { label: label(k), orders: 0, cents: 0, paidCents: 0 }
      r.orders++; r.cents += o.totalCents; if (o.settled) r.paidCents += o.totalCents; m.set(k, r)
    }
    return [...m.values()].sort((a, b) => b.cents - a.cents)
  }
  const items = new Map<string, { name: string; qty: number; cents: number; coupons: number }>()
  let coupons = 0, couponCents = 0
  for (const o of live) for (const i of o.items) {
    const r = items.get(i.name) || { name: i.name, qty: 0, cents: 0, coupons: 0 }
    r.qty += i.qty; r.cents += (i.qty - i.couponQty) * i.priceCents; r.coupons += i.couponQty * i.couponCost; items.set(i.name, r)
    coupons += i.couponQty * i.couponCost; couponCents += i.couponQty * i.priceCents
  }
  const prep = live.filter(o => o.readyAt).map(o => (new Date(o.readyAt!).getTime() - new Date(o.createdAt).getTime()) / 60000)
  const nameOf = (sid: number | null) => staff.find(x => x.id === sid)?.name ?? '—'
  return {
    door,
    grandCents: sum(paid) + door.cents,
    orders: live.length, cancelled: all.length - live.length,
    totalCents: sum(live), paidCents: sum(paid),
    cashCents: sum(paid.filter(o => o.paidMethod === 'cash')),
    cardCents: sum(paid.filter(o => o.paidMethod === 'card')),
    cardPendingCents: sum(live.filter(o => !o.paidAt && o.paidMethod === 'card')),
    cashPendingCents: sum(live.filter(o => !o.paidAt && o.paidMethod !== 'card')),
    // card money by the account it landed in
    accounts: (() => {
      const m = new Map<string, { label: string; orders: number; cents: number }>()
      for (const o of paid.filter(o => o.paidMethod === 'card')) {
        const k = o.accountName || '—'; const r = m.get(k) || { label: k, orders: 0, cents: 0 }; r.orders++; r.cents += o.totalCents; m.set(k, r)
      }
      return [...m.values()].sort((a, b) => b.cents - a.cents)
    })(),
    unpaidCents: sum(live.filter(o => !o.paidAt)),
    unpaidOrders: live.filter(o => !o.paidAt).length,
    // door coupons redeemed, and what they would have been worth
    coupons, couponCents,
    avgPrepMin: prep.length ? Math.round(prep.reduce((a, b) => a + b, 0) / prep.length * 10) / 10 : null,
    avgOrderCents: live.length ? Math.round(sum(live) / live.length) : 0,
    items: [...items.values()].sort((a, b) => b.qty - a.qty),
    tables: tally(o => o.tableNo, k => `Τραπέζι ${k}`).sort((a, b) => Number(a.label.slice(8)) - Number(b.label.slice(8)))
      .map(r => ({
        ...r,
        // what the table had, added up across its orders
        items: (() => {
          const m = new Map<string, { name: string; qty: number; cents: number }>()
          for (const o of live.filter(o => `Τραπέζι ${o.tableNo}` === r.label)) for (const i of o.items) {
            const x = m.get(i.name) || { name: i.name, qty: 0, cents: 0 }; x.qty += i.qty; x.cents += (i.qty - i.couponQty) * i.priceCents; m.set(i.name, x)
          }
          return [...m.values()].sort((a, b) => b.qty - a.qty)
        })()
      })),
    waiters: tally(o => o.waiterId, nameOf),
    bartenders: tally(o => o.bartenderId ?? 0, nameOf),
    hours: (() => {
      const m = new Map<string, { label: string; orders: number; cents: number }>()
      for (const o of live) {
        const h = new Date(o.createdAt).toLocaleTimeString('el-GR', { hour: '2-digit', timeZone: 'Asia/Nicosia' }).slice(0, 2) + ':00'
        const r = m.get(h) || { label: h, orders: 0, cents: 0 }; r.orders++; r.cents += o.totalCents; m.set(h, r)
      }
      return [...m.values()].sort((a, b) => a.label.localeCompare(b.label))
    })()
  }
})
