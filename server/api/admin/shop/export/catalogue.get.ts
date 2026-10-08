import { requireShopViewer, isShopManager } from '../../../../utils/shop'
import { catalogueOf, catalogueXlsx, cataloguePdf, sendShopFile } from '../../../../utils/shopExport'

/** The price list as it is now — what the shop shows, with its prices (and
    for whoever runs it, how many are left, if it counts them) — as an Excel
    workbook or a PDF with each item's picture. */
export default defineEventHandler(async (event) => {
  const me = await requireShopViewer(event, true)
  const format = getQuery(event).format === 'pdf' ? 'pdf' : 'xlsx'
  const items = await catalogueOf(isShopManager(me))
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  return sendShopFile(event, format === 'pdf' ? await cataloguePdf(items) : catalogueXlsx(items), `katastima-timokatalogos-${day}`, format)
})
