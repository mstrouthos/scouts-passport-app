import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireBarStaff, parseLayout } from '../../utils/bar'

/** Who I am tonight, and everything the screen needs to start: the event,
    the menu, my bartender or my waiters. */
export default defineEventHandler(async (event) => {
  const me = await requireBarStaff(event)
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, me.eventId)).limit(1))[0]
  const menu = (await db.select().from(s.barMenuItems).where(eq(s.barMenuItems.eventId, me.eventId)))
    .filter(m => m.isActive).sort((a, b) => a.sort - b.sort || a.id - b.id)
  const staff = (await db.select().from(s.barStaff).where(eq(s.barStaff.eventId, me.eventId))).filter(x => x.isActive)
  return {
    id: me.id, name: me.name, role: me.role,
    event: { id: ev.id, name: ev.name, tableCount: ev.tableCount, layout: parseLayout(ev.layout) },
    menu,
    bartender: me.role === 'waiter' ? staff.find(x => x.id === me.bartenderId)?.name ?? null : null,
    waiters: me.role === 'bartender' ? staff.filter(x => x.role === 'waiter' && x.bartenderId === me.id).map(x => x.name) : []
  }
})
