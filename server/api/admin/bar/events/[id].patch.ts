import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireBarAdmin } from '../../../../utils/bar'
import { now } from '../../../../utils/passcode'

export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const b = await readBody<any>(event)
  const set: any = {}
  if (b?.name !== undefined) { const v = String(b.name).trim(); if (!v) throw createError({ statusCode: 400, message: 'Name required' }); set.name = v }
  if (b?.eventDate !== undefined) set.eventDate = b.eventDate || null
  if (b?.couponsPerAdult !== undefined) set.couponsPerAdult = Math.max(0, Math.min(20, Math.floor(Number(b.couponsPerAdult)) || 0))
  if (b?.entranceCents !== undefined) set.entranceCents = Math.max(0, Math.round(Number(b.entranceCents)) || 0)
  if (b?.tableCount !== undefined) set.tableCount = Math.min(200, Math.max(1, Math.floor(Number(b.tableCount) || 10)))
  // closing signs the crew out; the figures stay
  if (b?.status === 'closed') { set.status = 'closed'; set.closedAt = now() }
  if (b?.status === 'open') { set.status = 'open'; set.closedAt = null }
  const db = await useDb()
  await db.update(s.barEvents).set(set).where(eq(s.barEvents.id, id))
  return { ok: true }
})
