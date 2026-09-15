import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { requireBarReader, ordersWithItems } from '../../../../../utils/bar'

/** The night in numbers: takings, what sold, which tables, who served, how
    fast the bar was. Kept for the next event's planning. */
export default defineEventHandler(async (event) => {
  await requireBarReader(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const all = await ordersWithItems(eq(s.barOrders.eventId, id))
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
    r.qty += i.qty; r.cents += (i.qty - i.couponQty) * i.priceCents; r.coupons += i.couponQty; items.set(i.name, r)
    coupons += i.couponQty; couponCents += i.couponQty * i.priceCents
  }
  const prep = live.filter(o => o.readyAt).map(o => (new Date(o.readyAt!).getTime() - new Date(o.createdAt).getTime()) / 60000)
  const nameOf = (sid: number | null) => staff.find(x => x.id === sid)?.name ?? '—'
  return {
    orders: live.length, cancelled: all.length - live.length,
    totalCents: sum(live), paidCents: sum(paid),
    cashCents: sum(paid.filter(o => o.paidMethod === 'cash')),
    cardCents: sum(paid.filter(o => o.paidMethod === 'card')),
    cardPendingCents: sum(live.filter(o => o.paidAt && o.paidMethod === 'card' && !o.cardConfirmedAt)),
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
