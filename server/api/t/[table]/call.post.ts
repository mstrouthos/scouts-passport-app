import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { tableOrThrow } from '../../../utils/guestTable'
import { parseLayout } from '../../../utils/bar'
import { sendPushToBarStaff } from '../../../utils/push'
import { now } from '../../../utils/passcode'

/* one call per table at a time, and a phone cannot fire twice within ten seconds */
const last = new Map<string, number>()

/** The table asks for its waiter. The waiter the organiser gave the table
    is buzzed; a table with none rings every waiter. */
export default defineEventHandler(async (event) => {
  const { ev, tableNo } = await tableOrThrow(getRouterParam(event, 'table'))
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const key = `${ip}:${tableNo}`
  if (Date.now() - (last.get(key) || 0) < 10_000) return { ok: true, repeated: true }
  const db = await useDb()
  const open = (await db.select().from(s.barCalls).where(eq(s.barCalls.eventId, ev.id))).find(c => c.tableNo === tableNo && !c.handledAt)
  if (open) return { ok: true, repeated: true, calledAt: open.createdAt }
  last.set(key, Date.now())
  const [row] = await db.insert(s.barCalls).values({ eventId: ev.id, tableNo, createdAt: now() }).returning()
  const assigned = parseLayout(ev.layout)?.waiters?.[String(tableNo)]
  const waiters = (await db.select().from(s.barStaff).where(eq(s.barStaff.eventId, ev.id))).filter(x => x.isActive && x.role === 'waiter')
  const targets = assigned && waiters.some(w => w.id === assigned) ? [assigned] : waiters.map(w => w.id)
  sendPushToBarStaff(targets, { title: `🔔 Τραπέζι ${tableNo} σε ζητάει`, body: 'Πάτησαν το κουμπί στο τραπέζι.' }).catch(() => {})
  return { ok: true, calledAt: row.createdAt }
})
