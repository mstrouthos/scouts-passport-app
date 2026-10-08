import { deflateRawSync } from 'node:zlib'

/* A plain Excel workbook (.xlsx): a sheet or a few, of text, numbers and sums
   in euros, the first row bold and frozen with a filter on it, columns sized
   to what is in them.
   Written by hand — an .xlsx is a zip of a few XML files — so Excel opens it
   with every value in its own cell whatever the computer's language, which a
   CSV cannot promise (Greek Excel splits on ";", not ","). */

const esc = (s: string) => s
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A1-style column name: 0 → A, 26 → AA. */
const colName = (i: number) => {
  let s = ''
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s
  return s
}

/** A cell: text, a plain number, a sum of money (in cents, shown in euros),
    or text in bold. */
export type Cell = string | number | null | undefined | { eur: number, bold?: boolean } | { text: string, bold: true }
export type Sheet = { name: string, rows: Cell[][], header?: boolean }

const cellText = (v: Cell) => v == null ? '' : typeof v === 'object' ? ('eur' in v ? (v.eur / 100).toFixed(2) : v.text) : String(v)

function sheetXml({ rows, header = true }: Sheet) {
  const width = Math.max(1, ...rows.map(r => r.length))
  // as wide as the longest line in the column, within reason
  const widths = Array.from({ length: width }, (_, c) => Math.min(60, Math.max(8,
    ...rows.map(r => Math.max(0, ...cellText(r[c]).split('\n').map(l => l.length))))) + 2)
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + (header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '')
    + '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>'
    + '<sheetData>' + rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
      const ref = colName(ci) + (ri + 1)
      if (typeof v === 'number') return `<c r="${ref}"${header && ri === 0 ? ' s="1"' : ''}><v>${v}</v></c>`
      if (v && typeof v === 'object' && 'eur' in v) return `<c r="${ref}" s="${v.bold ? 4 : 3}"><v>${(v.eur / 100).toFixed(2)}</v></c>`
      const text = cellText(v)
      const style = header && ri === 0 ? ' s="1"' : v && typeof v === 'object' ? ' s="5"' : text.includes('\n') ? ' s="2"' : ''
      return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(text)}</t></is></c>`
    }).join('') + '</row>').join('') + '</sheetData>'
    + (header && rows.length > 1 ? `<autoFilter ref="A1:${colName(width - 1)}${rows.length}"/>` : '')
    + '</worksheet>'
}

/** A workbook of one sheet or more. A sheet with a header has its first row
    bold and frozen, with a filter on it. */
export function xlsxBook(sheets: Sheet[]): Buffer {
  const name = (sh: Sheet) => esc(sh.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))
  const files: Record<string, string> = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + sheets.map((sh, i) => `<sheet name="${name(sh)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>'
      + (sheets.some(sh => sh.header !== false && sh.rows.length > 1)
        ? '<definedNames>' + sheets.map((sh, i) => sh.header !== false && sh.rows.length > 1
          ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${name(sh)}'!$A$1:$${colName(Math.max(1, ...sh.rows.map(r => r.length)) - 1)}$${sh.rows.length}</definedName>` : '').join('') + '</definedNames>'
        : '')
      + '</workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    // 0 plain, 1 the header (bold, shaded, wrapped), 2 a cell with line breaks,
    // 3 euros, 4 euros in bold, 5 text in bold
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2EEE7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
  }
  sheets.forEach((sh, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(sh) })
  return zip(Object.entries(files).map(([name, s]) => ({ name, data: Buffer.from(s, 'utf8') })))
}

/** One sheet of text, its first row the header. */
export function xlsx(rows: string[][], sheet = 'Απαντήσεις'): Buffer {
  return xlsxBook([{ name: sheet, rows }])
}

/* ---- the smallest zip that Excel accepts: deflated entries, a central
   directory, and the end record ---- */
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
function crc32(b: Buffer) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}
function zip(entries: { name: string, data: Buffer }[]): Buffer {
  const parts: Buffer[] = [], central: Buffer[] = []
  let offset = 0
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8')
    const body = deflateRawSync(e.data)
    const crc = crc32(e.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034B50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8)
    local.writeUInt32LE(0, 10); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(e.data.length, 22)
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28)
    parts.push(local, name, body)
    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014B50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10)
    cen.writeUInt32LE(0, 12); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20); cen.writeUInt32LE(e.data.length, 24)
    cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(offset, 42)
    central.push(cen, name)
    offset += 30 + name.length + body.length
  }
  const dir = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054B50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, dir, end])
}
