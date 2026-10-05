import { and, eq, gt } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { specOf, isAccepting } from '../../../../utils/forms'
import { ipHash } from '../../../../utils/seal'
import { saveFormFile } from '../../../../utils/formFiles'
import { FILE_TYPES, FILE_MAX_BYTES } from '../../../../../utils/formSpec'

/** A picture or a PDF for an upload question, sent the moment it is chosen
    so the form itself stays light. It waits, encrypted and known only by the
    token returned here, until the form is sent and claims it. */
export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const db = await useDb()
  const f = (await db.select().from(s.forms).where(eq(s.forms.slug, slug)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Η φόρμα δεν βρέθηκε' })
  if (!isAccepting(f)) throw createError({ statusCode: 410, message: 'Η φόρμα έχει κλείσει' })
  const b = await readBody<{ questionId?: string, name?: string, mime?: string, dataBase64?: string }>(event)
  const q = specOf(f).modules.flatMap(m => m.questions).find(x => x.id === b?.questionId && x.type === 'file')
  if (!q) throw createError({ statusCode: 400, message: 'Άγνωστη ερώτηση' })
  const mime = String(b?.mime || '')
  if (!FILE_TYPES.includes(mime)) throw createError({ statusCode: 400, message: 'Μόνο φωτογραφίες ή PDF' })
  const buf = Buffer.from(String(b?.dataBase64 || ''), 'base64')
  if (!buf.length) throw createError({ statusCode: 400, message: 'Άδειο αρχείο' })
  if (buf.length > FILE_MAX_BYTES) throw createError({ statusCode: 413, message: 'Το αρχείο ξεπερνά τα 10 MB' })
  // the file must be what it says it is
  const head = buf.subarray(0, 5).toString('latin1')
  const ok = mime === 'application/pdf' ? head === '%PDF-'
    : mime === 'image/png' ? buf[0] === 0x89 && head.slice(1, 4) === 'PNG'
    : buf[0] === 0xFF && buf[1] === 0xD8
  if (!ok) throw createError({ statusCode: 400, message: 'Το αρχείο δεν είναι έγκυρη φωτογραφία ή PDF' })

  const who = ipHash(getRequestIP(event, { xForwardedFor: true }) || 'unknown')
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const recent = await db.select({ id: s.formFiles.id }).from(s.formFiles)
    .where(and(eq(s.formFiles.ipHash, who), gt(s.formFiles.createdAt, since)))
  if (recent.length >= 40) throw createError({ statusCode: 429, message: 'Πάρα πολλά αρχεία — δοκιμάστε ξανά σε λίγα λεπτά' })

  const ext = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg'
  const name = (String(b?.name || 'arxeio').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 100) || 'arxeio') + ext
  const row = await saveFormFile({ formId: f.id, kind: 'upload', questionId: q.id, name, mime, buf, ipHash: who })
  return { token: row.token, name: row.name, mime: row.mime, size: row.size }
})
