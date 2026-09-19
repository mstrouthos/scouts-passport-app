import QRCode from 'qrcode'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { requireBarReader } from '../../../../../utils/bar'

/** One code per table, as SVG, ready to print. The code carries only the
    table number, so the same cards serve every event. */
export default defineEventHandler(async (event) => {
  await requireBarReader(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = await useDb()
  const ev = (await db.select().from(s.barEvents).where(eq(s.barEvents.id, id)))[0]
  if (!ev) throw createError({ statusCode: 404, message: 'Not found' })
  const origin = getRequestURL(event).origin
  const out = []
  for (let no = 1; no <= ev.tableCount; no++) {
    const url = `${origin}/t/${no}`
    out.push({ no, url, svg: await QRCode.toString(url, { type: 'svg', margin: 1, width: 240, errorCorrectionLevel: 'M' }) })
  }
  return { event: ev.name, tables: out }
})
