import { asc, inArray } from 'drizzle-orm'
import { PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib'
import { useDb, schema as s } from '../db'
import { pdfFonts as fonts, pdfWrap as wrap, pdfClean as clean } from './formPdf'
import { readStored } from './storage'
import { xlsxBook, type Cell } from './xlsx'
import { effectOf, imagesOf, trackStock, type Entry } from './shop'

/* The shop on paper: its price list, and what it sold over a stretch of days
   — as an Excel workbook or a PDF. */

const eur = (c: number) => (c / 100).toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
/** The day a line was written, in Cyprus. */
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
const dmy = (day: string) => day.split('-').reverse().join('/')
const whenOf = (iso: string) => new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const KIND: Record<string, string> = { payment: 'Πληρωμή', expense: 'Έξοδο', deposit: 'Κατάθεση στην τράπεζα', count: 'Μέτρηση ταμείου' }
const METHOD: Record<string, string> = { cash: 'Μετρητά', bank: 'Τραπεζική μεταφορά' }

/* ---- the price list ---- */
export async function catalogueOf(withStock: boolean) {
  const db = await useDb()
  const counting = withStock && await trackStock()
  const items = (await db.select().from(s.shopItems).orderBy(asc(s.shopItems.sortOrder), asc(s.shopItems.name))).filter(i => i.visible)
  return items.map(i => ({ name: i.name, description: i.description || '', priceCents: i.priceCents, stock: counting ? i.stock : null, cover: imagesOf(i)[0] ?? null }))
}
type CatalogueItem = Awaited<ReturnType<typeof catalogueOf>>[number]

export function catalogueXlsx(items: CatalogueItem[]): Buffer {
  const stock = items.some(i => i.stock != null)
  return xlsxBook([{
    name: 'Τιμοκατάλογος',
    rows: [
      ['Είδος', 'Περιγραφή', 'Τιμή', ...(stock ? ['Απόθεμα'] : [])],
      ...items.map(i => [i.name, i.description, { eur: i.priceCents }, ...(stock ? [i.stock ?? ''] : [])] as Cell[])
    ]
  }])
}

/* ---- what was sold, from one day to another (both included) ---- */
export async function salesReport(from: string, to: string) {
  const db = await useDb()
  const lines = (await db.select().from(s.shopEntries)).filter(e => { const d = dayOf(e.createdAt); return d >= from && d <= to })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
  const live = lines.filter(e => !e.voidedAt)
  const sum = (list: Entry[], f: (e: Entry) => number) => list.reduce((n, e) => n + f(e), 0)
  const payments = live.filter(e => e.kind === 'payment')
  const expenses = live.filter(e => e.kind === 'expense')
  // each item sold, by what it was called and sold for at the time
  const byItem = new Map<string, { name: string, qty: number, cents: number }>()
  for (const p of payments) {
    let list: { id?: number, name?: string, qty?: number, priceCents?: number }[] = []
    try { list = p.items ? JSON.parse(p.items) : [] } catch {}
    for (const x of list) {
      const key = `${x.id ?? ''}|${x.name ?? ''}`
      const row = byItem.get(key) || { name: String(x.name || '—'), qty: 0, cents: 0 }
      row.qty += Number(x.qty) || 0; row.cents += (Number(x.qty) || 0) * (Number(x.priceCents) || 0)
      byItem.set(key, row)
    }
  }
  const items = [...byItem.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'el'))
  const itemsCents = items.reduce((n, i) => n + i.cents, 0)
  const salesCents = sum(payments, e => e.amountCents)
  const change = live.reduce((t, e) => { const x = effectOf(e); return { cash: t.cash + x.cash, bank: t.bank + x.bank } }, { cash: 0, bank: 0 })
  return {
    from, to, lines,
    sales: {
      count: payments.length, total: salesCents,
      cash: sum(payments.filter(e => e.method === 'cash'), e => e.amountCents),
      bank: sum(payments.filter(e => e.method === 'bank'), e => e.amountCents)
    },
    items, itemsQty: items.reduce((n, i) => n + i.qty, 0), itemsCents,
    // paid for other than the items at their price: things by a note, a discount, a tip
    otherCents: salesCents - itemsCents,
    expenses: { total: sum(expenses, e => e.amountCents), cash: sum(expenses.filter(e => e.method === 'cash'), e => e.amountCents), bank: sum(expenses.filter(e => e.method === 'bank'), e => e.amountCents) },
    deposits: sum(live.filter(e => e.kind === 'deposit'), e => e.amountCents),
    counts: sum(live.filter(e => e.kind === 'count'), e => e.amountCents),
    change, voided: lines.length - live.length
  }
}
type Report = Awaited<ReturnType<typeof salesReport>>

/** The summary as label and value, shared by the workbook and the PDF. */
function summary(r: Report): ([string, Cell] | null)[] {
  return [
    ['Πληρωμές', r.sales.count],
    ['Σύνολο πωλήσεων', { eur: r.sales.total, bold: true }],
    ['   σε μετρητά', { eur: r.sales.cash }],
    ['   με τραπεζική μεταφορά', { eur: r.sales.bank }],
    null,
    ['Είδη που πουλήθηκαν (τεμάχια)', r.itemsQty],
    ['Αξία ειδών', { eur: r.itemsCents, bold: true }],
    ['Άλλες πληρωμές ή διαφορά', { eur: r.otherCents }],
    null,
    ['Έξοδα', { eur: r.expenses.total }],
    ['   από μετρητά', { eur: r.expenses.cash }],
    ['   από την τράπεζα', { eur: r.expenses.bank }],
    ['Μετρητά που κατατέθηκαν στην τράπεζα', { eur: r.deposits }],
    ['Διορθώσεις από μετρήσεις του ταμείου', { eur: r.counts }],
    null,
    ['Μεταβολή στα μετρητά', { eur: r.change.cash, bold: true }],
    ['Μεταβολή στην τράπεζα', { eur: r.change.bank, bold: true }],
    ['Ακυρωμένες κινήσεις (δεν μετράνε)', r.voided]
  ]
}
const lineItems = (e: Entry) => { try { return (e.items ? JSON.parse(e.items) : []).map((x: any) => `${x.qty}× ${x.name}`).join(', ') } catch { return '' } }
const signed = (e: Entry) => e.kind === 'expense' ? -e.amountCents : e.amountCents

export function salesXlsx(r: Report): Buffer {
  return xlsxBook([
    {
      name: 'Σύνοψη', header: false,
      rows: [
        [{ text: 'Κατάστημα — Πωλήσεις', bold: true }],
        ['Περίοδος', `${dmy(r.from)} – ${dmy(r.to)}`],
        [],
        ...summary(r).map(x => x ? [x[0], x[1]] : [])
      ]
    },
    {
      name: 'Ανά είδος',
      rows: [
        ['Είδος', 'Τεμάχια', 'Αξία'],
        ...r.items.map(i => [i.name, i.qty, { eur: i.cents }] as Cell[]),
        [{ text: 'Σύνολο', bold: true }, r.itemsQty, { eur: r.itemsCents, bold: true }]
      ]
    },
    {
      name: 'Κινήσεις',
      rows: [
        ['Ημερομηνία', 'Κίνηση', 'Τρόπος', 'Ποσό', 'Πληρωτής', 'Είδη', 'Σημείωση', 'Καταχώρισε', 'Ακυρώθηκε'],
        ...r.lines.map(e => [
          whenOf(e.createdAt), KIND[e.kind] || e.kind, e.kind === 'deposit' ? 'Μετρητά → τράπεζα' : METHOD[e.method || ''] || '',
          { eur: signed(e) }, e.payer || '', lineItems(e), e.note || '', e.createdName,
          e.voidedAt ? `${e.voidedName || ''}: ${e.voidReason || ''}` : ''
        ] as Cell[])
      ]
    }
  ])
}

/* ---- the PDFs ---- */
const A4 = { w: 595.28, h: 841.89 }
const M = 44
const INK = rgb(0.086, 0.137, 0.231), MUTED = rgb(0.48, 0.54, 0.63), GREEN = rgb(0.153, 0.42, 0.31), LINE = rgb(0.86, 0.9, 0.94)

/** A page that flows on to the next: lines of text, rules, and room checked. */
async function sheetOf(title: string) {
  const doc = await PDFDocument.create()
  doc.setTitle(title); doc.setProducer('Πύλη Προσκόπων')
  const f = await fonts(doc)
  let page: PDFPage = doc.addPage([A4.w, A4.h]), y = A4.h - M
  const w = {
    doc, f,
    get page() { return page }, get y() { return y }, set y(v: number) { y = v },
    room(h: number) { if (y - h < M) { page = doc.addPage([A4.w, A4.h]); y = A4.h - M } },
    text(str: string, x: number, size: number, font: PDFFont = f.regular, color = INK, at = y) { page.drawText(clean(font, str), { x, y: at, size, font, color }) },
    right(str: string, xr: number, size: number, font: PDFFont = f.regular, color = INK, at = y) {
      const t = clean(font, str); page.drawText(t, { x: xr - font.widthOfTextAtSize(t, size), y: at, size, font, color })
    },
    rule(at = y) { page.drawLine({ start: { x: M, y: at }, end: { x: A4.w - M, y: at }, thickness: .6, color: LINE }) }
  }
  return w
}
const today = () => new Date().toLocaleDateString('el-GR', { timeZone: 'Europe/Nicosia', day: 'numeric', month: 'long', year: 'numeric' })

export async function cataloguePdf(items: CatalogueItem[]): Promise<Uint8Array> {
  const w = await sheetOf('Κατάστημα — Τιμοκατάλογος')
  const { f } = w
  w.text('Κατάστημα — Τιμοκατάλογος', M, 20, f.bold); w.y -= 18
  w.text(`30ο Σύστημα Προσκόπων Αμμοχώστου · ${today()}`, M, 10, f.regular, MUTED); w.y -= 22
  // each item's cover picture, if it has one the PDF can carry
  const db = await useDb()
  const ids = items.map(i => i.cover).filter((x): x is number => x != null)
  const files = ids.length ? await db.select().from(s.files).where(inArray(s.files.id, ids)) : []
  const pics = new Map<number, PDFImage>()
  for (const file of files) {
    try {
      const bytes = await readStored(file.data)
      if (file.mime === 'image/jpeg') pics.set(file.id, await w.doc.embedJpg(bytes))
      else if (file.mime === 'image/png') pics.set(file.id, await w.doc.embedPng(bytes))
    } catch {}
  }
  const anyPic = pics.size > 0, TH = 54, textX = M + (anyPic ? TH + 12 : 0), priceR = A4.w - M
  const textW = priceR - 90 - textX
  for (const i of items) {
    const desc = i.description ? wrap(clean(f.regular, i.description), f.regular, 10, textW) : []
    const h = Math.max(anyPic ? TH : 0, 16 + desc.length * 13 + (i.stock != null ? 13 : 0)) + 14
    w.room(h)
    const top = w.y
    const pic = i.cover != null ? pics.get(i.cover) : null
    if (pic) {
      const k = Math.min(TH / pic.width, TH / pic.height)
      w.page.drawImage(pic, { x: M + (TH - pic.width * k) / 2, y: top - TH + (TH - pic.height * k) / 2 + 4, width: pic.width * k, height: pic.height * k })
    }
    w.text(i.name, textX, 13, f.bold, INK, top - 8)
    w.right(eur(i.priceCents), priceR, 13, f.bold, GREEN, top - 8)
    desc.forEach((l, k) => w.text(l, textX, 10, f.regular, MUTED, top - 24 - k * 13))
    if (i.stock != null) w.text(`Απόθεμα: ${i.stock}`, textX, 9, f.regular, MUTED, top - 24 - desc.length * 13)
    w.y = top - h
    w.rule(w.y + 6)
  }
  if (!items.length) w.text('Το κατάστημα δεν έχει είδη.', M, 11, f.regular, MUTED)
  return w.doc.save()
}

export async function salesPdf(r: Report): Promise<Uint8Array> {
  const w = await sheetOf('Κατάστημα — Πωλήσεις')
  const { f } = w
  const R = A4.w - M
  w.text('Κατάστημα — Πωλήσεις', M, 20, f.bold); w.y -= 18
  w.text(`${dmy(r.from)} – ${dmy(r.to)} · έκδοση ${today()}`, M, 10, f.regular, MUTED); w.y -= 26

  // the summary
  for (const x of summary(r)) {
    if (!x) { w.y -= 6; continue }
    w.room(16)
    const bold = typeof x[1] === 'object' && x[1] != null && 'bold' in x[1] && !!x[1].bold
    w.text(x[0], M, 11, bold ? f.bold : f.regular)
    const v = x[1]
    w.right(typeof v === 'number' ? String(v) : v && typeof v === 'object' && 'eur' in v ? eur(v.eur) : '', R, 11, bold ? f.bold : f.regular)
    w.y -= 16
  }

  // each item: how many, for how much
  w.y -= 14; w.room(40)
  w.text('Ανά είδος', M, 14, f.bold); w.y -= 18
  w.text('Είδος', M, 9, f.bold, MUTED); w.right('Τεμάχια', R - 110, 9, f.bold, MUTED); w.right('Αξία', R, 9, f.bold, MUTED); w.y -= 6
  w.rule(); w.y -= 14
  for (const i of r.items) {
    w.room(16)
    w.text(wrap(clean(f.regular, i.name), f.regular, 11, R - 150 - M)[0] || '', M, 11)
    w.right(String(i.qty), R - 110, 11); w.right(eur(i.cents), R, 11); w.y -= 16
  }
  if (!r.items.length) { w.text('Δεν πουλήθηκαν είδη.', M, 10, f.regular, MUTED); w.y -= 16 }
  else { w.rule(w.y + 10); w.y -= 4; w.text('Σύνολο', M, 11, f.bold); w.right(String(r.itemsQty), R - 110, 11, f.bold); w.right(eur(r.itemsCents), R, 11, f.bold); w.y -= 16 }

  // every line in the book, cancelled ones marked
  w.y -= 14; w.room(40)
  w.text('Κινήσεις', M, 14, f.bold); w.y -= 18
  const col = { when: M, kind: M + 78, who: M + 190, amt: R }
  for (const e of r.lines) {
    const detail = [e.payer, lineItems(e), e.note].filter(Boolean).join(' · ')
    const more = detail ? wrap(clean(f.regular, detail), f.regular, 8.5, R - 70 - col.who) : []
    const voidLine = e.voidedAt ? `✖ Ακυρώθηκε (${e.voidedName || ''}): ${e.voidReason || ''}` : ''
    const h = 13 + Math.max(0, more.length - 1) * 11 + (voidLine ? 11 : 0) + 5
    w.room(h)
    const top = w.y, color = e.voidedAt ? MUTED : INK
    w.text(whenOf(e.createdAt), col.when, 8.5, f.regular, MUTED, top)
    w.text(`${KIND[e.kind] || e.kind}${e.kind === 'deposit' ? '' : e.method ? ` · ${METHOD[e.method] === 'Τραπεζική μεταφορά' ? 'Τράπεζα' : METHOD[e.method]}` : ''}`, col.kind, 8.5, f.regular, color, top)
    more.forEach((l, k) => w.text(l, col.who, 8.5, f.regular, color, top - k * 11))
    w.right(eur(signed(e)), col.amt, 9, f.bold, color, top)
    if (voidLine) w.text(clean(f.regular, voidLine), col.who, 8, f.regular, rgb(.7, .15, .12), top - Math.max(1, more.length) * 11)
    w.y = top - h
  }
  if (!r.lines.length) w.text('Καμία κίνηση σε αυτές τις μέρες.', M, 10, f.regular, MUTED)
  return w.doc.save()
}

/** The file sent to download, under a name that says what it is. */
export function sendShopFile(event: any, bytes: Uint8Array | Buffer, name: string, format: 'xlsx' | 'pdf') {
  setResponseHeader(event, 'Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${name}.${format}"; filename*=UTF-8''${encodeURIComponent(name)}.${format}`)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return Buffer.from(bytes)
}
