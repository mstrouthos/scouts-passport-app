import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/** The one open event a QR code on a table points at. The cards carry only
    the table number, so they are good for every event. */
export async function openEvent() {
  const db = await useDb()
  const open = (await db.select().from(s.barEvents)).filter(e => e.status === 'open').sort((a, b) => b.id - a.id)
  return open[0] || null
}
export async function tableOrThrow(tableRaw: string | undefined) {
  const ev = await openEvent()
  if (!ev) throw createError({ statusCode: 404, message: 'Δεν υπάρχει εκδήλωση σε εξέλιξη' })
  const tableNo = Number(tableRaw)
  if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > ev.tableCount) throw createError({ statusCode: 404, message: 'Άγνωστο τραπέζι' })
  return { ev, tableNo }
}
export const eqEvent = eq
