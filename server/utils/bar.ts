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
  const nameOf = (id: number | null) => staff.find(x => x.id === id)?.name ?? null
  return orders.map(o => ({
    ...o,
    waiterName: nameOf(o.waiterId), bartenderName: nameOf(o.bartenderId),
    items: items.filter(i => i.orderId === o.id),
    // paid and settled: cash on the spot, or a card the cashier has confirmed
    settled: !!o.paidAt && (o.paidMethod !== 'card' || !!o.cardConfirmedAt)
  }))
}

/** The floor plan. Positions are fractions of the plan's width and height,
    so the same plan fits any phone. */
export type Layout = { tables: Array<{ no: number; x: number; y: number }>; marks: Array<{ id: string; label: string; x: number; y: number }> }
export function parseLayout(raw: string | null): Layout | null {
  if (!raw) return null
  try {
    const j = JSON.parse(raw)
    const f = (v: any) => Math.min(1, Math.max(0, Number(v) || 0))
    return {
      tables: (Array.isArray(j.tables) ? j.tables : []).map((t: any) => ({ no: Number(t.no), x: f(t.x), y: f(t.y) })).filter((t: any) => Number.isInteger(t.no) && t.no > 0),
      marks: (Array.isArray(j.marks) ? j.marks : []).slice(0, 20).map((m: any) => ({ id: String(m.id || '').slice(0, 20), label: String(m.label || '').slice(0, 24), x: f(m.x), y: f(m.y) })).filter((m: any) => m.label)
    }
  } catch { return null }
}

export { and, eq }
