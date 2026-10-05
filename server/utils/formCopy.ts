import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { unseal } from './seal'
import { filesOfResponse, openFormFile, type FormFile } from './formFiles'
import { responsePdf } from './formPdf'
import { normalizeSpec } from '../../utils/formSpec'
import { noteError } from './errorReport'
import { sendEmailWithFiles } from './email'

/** A response's PDF, made now from what was sent and the files that came
    with it, and those files themselves. */
export async function buildResponsePdf(responseId: number) {
  const db = await useDb()
  const r = (await db.select().from(s.formResponses).where(eq(s.formResponses.id, responseId)).limit(1))[0]
  if (!r) throw createError({ statusCode: 404, message: 'Not found' })
  const f = (await db.select().from(s.forms).where(eq(s.forms.id, r.formId)).limit(1))[0]
  const rows = await filesOfResponse(responseId)
  const files: Record<string, { row: FormFile, bytes: Buffer }> = {}
  for (const [k, row] of Object.entries(rows)) {
    try { files[k] = { row, bytes: await openFormFile(row) } } catch (e) { noteError('Φόρμες — αρχείο δεν ανοίγει για το PDF', e, { file: row.id, response: responseId }) }
  }
  const pdf = await responsePdf({
    formTitle: f?.titleEl ?? 'Φόρμα', responseId: r.id, createdAt: r.createdAt,
    spec: normalizeSpec(JSON.parse(r.spec)), data: unseal(r.sealed), files
  })
  return { r, f, pdf: Buffer.from(pdf), files }
}

// Resend takes up to 40 MB an email, counted after base64 — the files go
// along only while they fit; the PDF already has the pictures and the PDFs
const ATTACH_LIMIT = 28 * 1024 * 1024

/** The person's own copy: the PDF and what they uploaded, emailed to the
    address they gave. Never throws — a failure is reported, the response is
    kept all the same. */
export async function sendResponseCopy(responseId: number, to: string) {
  try {
    const { r, f, pdf, files } = await buildResponsePdf(responseId)
    const title = f?.titleEl ?? 'Φόρμα'
    const attach = [{ name: `${f?.slug || 'forma'}-${r.id}.pdf`, bytes: pdf }]
    let size = pdf.length, left = 0
    const used = new Set(attach.map(a => a.name))
    for (const { row, bytes } of Object.values(files)) {
      if (size + bytes.length > ATTACH_LIMIT) { left++; continue }
      // two uploads called the same keep both
      let name = row.name, n = 1
      while (used.has(name)) name = row.name.replace(/(\.[^.]*)?$/, m => ` (${++n})${m}`)
      used.add(name)
      attach.push({ name, bytes }); size += bytes.length
    }
    const when = new Date(r.createdAt).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const text = [
      'Γεια σας,',
      '',
      `Ευχαριστούμε που συμπληρώσατε τη φόρμα «${title}».`,
      `Επισυνάπτεται αντίγραφο των απαντήσεών σας σε PDF${attach.length > 1 ? ', μαζί με τα αρχεία που ανεβάσατε' : ''}.`,
      ...(left ? [`(${left === 1 ? 'Ένα αρχείο ήταν' : `${left} αρχεία ήταν`} πολύ μεγάλ${left === 1 ? 'ο' : 'α'} για να σταλεί με email· οι φωτογραφίες και τα PDF περιέχονται ήδη στο αντίγραφο.)`] : []),
      '',
      `Υποβολή #${r.id} · ${when}`,
      '',
      '30ό Σύστημα Προσκόπων Αμμοχώστου'
    ].join('\n')
    await sendEmailWithFiles(to, `Αντίγραφο: ${title}`, text, attach)
  } catch (e) {
    // the address is the person's own; it stays out of the report
    noteError('Φόρμες — αντίγραφο με email', e, { response: responseId })
  }
}
