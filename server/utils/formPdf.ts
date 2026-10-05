import { PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { visibleParts, answerText, instanceTitle, type FormSpec, type FormAnswers } from '../../utils/formSpec'
import type { FormFile } from './formFiles'

/* One form response as a PDF: everything the person was asked and what they
   answered, section by section; their pictures in place; the tickboxes; the
   signature with the name and date under it; and any PDFs they uploaded,
   appended at the end. In the app's own typeface, which writes Greek. */

const A4 = { w: 595.28, h: 841.89 }
const M = 48                      // page margin
const W = A4.w - 2 * M            // text width
const INK = rgb(0.086, 0.137, 0.231)
const MUTED = rgb(0.48, 0.54, 0.63)
const GREEN = rgb(0.153, 0.278, 0.227)
const LINE = rgb(0.86, 0.9, 0.94)

async function fonts(doc: PDFDocument) {
  doc.registerFontkit(fontkit)
  const store = useStorage('assets:server')
  const raw = async (n: string) => {
    const v = await store.getItemRaw(`fonts/${n}`)
    return v instanceof Uint8Array ? v : new Uint8Array(v as ArrayBuffer)
  }
  return {
    regular: await doc.embedFont(await raw('Commissioner_400Regular.ttf'), { subset: true }),
    bold: await doc.embedFont(await raw('Commissioner_700Bold.ttf'), { subset: true })
  }
}

/** Lines of at most `width`, breaking at spaces, and inside a word only if
    one word alone is too long. Line breaks the person typed are kept. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of String(text).replace(/\r/g, '').split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(tryLine, size) <= width) { line = tryLine; continue }
      if (line) out.push(line)
      // a single word wider than the line is cut into pieces
      let w = word
      while (font.widthOfTextAtSize(w, size) > width) {
        let n = w.length
        while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), size) > width) n--
        out.push(w.slice(0, n)); w = w.slice(n)
      }
      line = w
    }
    out.push(line)
  }
  return out
}

/** Characters the typeface cannot draw (emoji, mostly) are left out rather
    than printed as empty boxes. */
const clean = (font: PDFFont, s: string) => {
  const set = font.getCharacterSet()
  return [...String(s ?? '')].filter(ch => ch === '\n' || set.includes(ch.codePointAt(0)!)).join('')
}

export async function responsePdf(p: {
  formTitle: string, responseId: number, createdAt: string
  spec: FormSpec, data: FormAnswers
  files: Record<string, { row: FormFile, bytes: Buffer }>
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${p.formTitle} — #${p.responseId}`)
  doc.setProducer('Πύλη Προσκόπων')
  const { regular, bold } = await fonts(doc)
  const when = (iso: string) => new Date(iso).toLocaleString('el-GR', {
    timeZone: 'Europe/Nicosia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  let page: PDFPage = doc.addPage([A4.w, A4.h])
  let y = A4.h - M
  const newPage = () => { page = doc.addPage([A4.w, A4.h]); y = A4.h - M }
  const room = (h: number) => { if (y - h < M + 24) newPage() }
  const text = (s: string, o: { font?: PDFFont, size?: number, color?: any, gap?: number, indent?: number } = {}) => {
    const font = o.font || regular, size = o.size || 10.5, lh = size * 1.38
    for (const line of wrap(clean(font, s), font, size, W - (o.indent || 0))) {
      room(lh)
      page.drawText(line, { x: M + (o.indent || 0), y: y - size, size, font, color: o.color || INK })
      y -= lh
    }
    y -= o.gap ?? 0
  }
  const rule = (gap = 10) => {
    room(gap * 2)
    y -= gap
    page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.7, color: LINE })
    y -= gap
  }
  const image = async (bytes: Buffer, mime: string, maxW: number, maxH: number, indent = 0) => {
    let img: PDFImage
    try { img = mime === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes) } catch { return false }
    const s = Math.min(maxW / img.width, maxH / img.height, 1)
    const w = img.width * s, h = img.height * s
    room(h + 6)
    page.drawImage(img, { x: M + indent, y: y - h, width: w, height: h })
    y -= h + 6
    return true
  }

  // the heading
  text('30ό Σύστημα Προσκόπων Αμμοχώστου', { size: 9, color: MUTED, gap: 2 })
  text(p.formTitle, { font: bold, size: 18, gap: 2 })
  text(`Υποβολή #${p.responseId} · ${when(p.createdAt)}`, { size: 9.5, color: MUTED })
  rule(12)

  // each section as it was met: a repeated one once per child, titled for it
  const seen = visibleParts(p.spec, p.data.answers || {}, p.data.repeats)
  const attachedPdfs: Array<{ name: string, bytes: Buffer }> = []
  for (const inst of seen.shown) {
    const title = instanceTitle(inst)
    if (title) { room(40); text(title, { font: bold, size: 13, color: GREEN, gap: 6 }) }
    for (const q of inst.m.questions) {
      const key = q.id + inst.sfx
      if (!seen.questions.has(key)) continue
      room(36)
      text(q.label, { size: 9, color: MUTED, gap: 1 })
      const v = p.data.answers?.[key]
      if (q.type === 'file') {
        const list = (Array.isArray(v) ? v : []).map(k => p.files[k]).filter(Boolean)
        if (!list.length) text('—', { font: bold, size: 11, gap: 8 })
        for (const f of list) {
          const isPdf = f.row.mime === 'application/pdf'
          text(`${f.row.name}${isPdf ? '  (επισυνάπτεται στο τέλος)' : ''}`, { font: bold, size: 10.5, gap: 3 })
          if (isPdf) attachedPdfs.push({ name: f.row.name, bytes: f.bytes })
          else await image(f.bytes, f.row.mime, W, 300)
        }
        y -= 6
      } else {
        const a = answerText(v, q.type).trim()
        text(a || '—', { font: bold, size: 11, color: a ? INK : MUTED, gap: 8 })
      }
    }
    y -= 6
  }

  // the declarations, each with its box, and the signature
  if (p.spec.ticks.length || p.spec.signature.enabled) rule(8)
  for (const x of p.spec.ticks) {
    const on = !!p.data.ticks?.[x.id]
    const lines = wrap(clean(regular, x.label), regular, 10.5, W - 22)
    room(lines.length * 14.5 + 6)
    const top = y
    page.drawRectangle({ x: M, y: top - 12, width: 11, height: 11, borderWidth: 1, borderColor: on ? GREEN : MUTED, color: on ? GREEN : undefined })
    if (on) {
      page.drawLine({ start: { x: M + 2.3, y: top - 6.5 }, end: { x: M + 4.6, y: top - 9.3 }, thickness: 1.5, color: rgb(1, 1, 1) })
      page.drawLine({ start: { x: M + 4.6, y: top - 9.3 }, end: { x: M + 8.9, y: top - 3.6 }, thickness: 1.5, color: rgb(1, 1, 1) })
    }
    text(x.label, { indent: 22, gap: 6 })
  }
  if (p.spec.signature.enabled) {
    room(150)
    y -= 6
    text(p.spec.signature.label || 'Υπογραφή', { size: 9, color: MUTED, gap: 4 })
    if (p.data.signature) {
      const png = Buffer.from(p.data.signature.split(',')[1] || '', 'base64')
      await image(png, 'image/png', 260, 110)
    } else text('—', { font: bold, size: 11 })
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: M + 260, y: y + 2 }, thickness: 0.7, color: MUTED })
    y -= 6
    if (p.data.signerName) text(`Ονοματεπώνυμο: ${p.data.signerName}`, { size: 10.5, gap: 1 })
    if (p.data.signedAt) text(`Ημερομηνία: ${when(p.data.signedAt)}`, { size: 10.5 })
  }

  // the PDFs they uploaded, whole, after the answers
  for (const a of attachedPdfs) {
    try {
      const src = await PDFDocument.load(a.bytes, { ignoreEncryption: true })
      const pages = await doc.copyPages(src, src.getPageIndices())
      for (const pg of pages) doc.addPage(pg)
    } catch {
      newPage()
      text(`Το συνημμένο «${a.name}» δεν μπορεί να ενσωματωθεί — ανοίξτε το από την εφαρμογή.`, { color: MUTED })
    }
  }

  // page numbers, on the response's own pages and the appended ones alike
  const all = doc.getPages()
  all.forEach((pg, i) => {
    const label = `#${p.responseId} · ${i + 1} / ${all.length}`
    const { width } = pg.getSize()
    pg.drawText(clean(regular, label), { x: width - M - regular.widthOfTextAtSize(label, 8), y: 22, size: 8, font: regular, color: MUTED })
  })
  return doc.save()
}
