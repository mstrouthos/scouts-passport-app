import { requireShopManager } from '../../../../utils/shop'
import { salesReport, salesXlsx, salesPdf, sendShopFile } from '../../../../utils/shopExport'

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** What the shop sold from one day to another (both included): each item
    and how many, the sales in cash and by bank transfer, the money out, and
    every line of the book — as an Excel workbook or a PDF. Only for whoever
    runs the shop. */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const q = getQuery(event)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  const from = DAY.test(String(q.from)) ? String(q.from) : `${today.slice(0, 8)}01`
  const to = DAY.test(String(q.to)) ? String(q.to) : today
  if (from > to) throw createError({ statusCode: 400, message: 'Η αρχή είναι μετά το τέλος' })
  const format = q.format === 'pdf' ? 'pdf' : 'xlsx'
  const r = await salesReport(from, to)
  return sendShopFile(event, format === 'pdf' ? await salesPdf(r) : salesXlsx(r), `katastima-poliseis-${from}_${to}`, format)
})
