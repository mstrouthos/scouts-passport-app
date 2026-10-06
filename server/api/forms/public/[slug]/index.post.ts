import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { specOf, isAccepting } from '../../../../utils/forms'
import { seal, ipHash } from '../../../../utils/seal'
import { checkAnswers, baseId, repeatGroups, copiesOf, emailCopyAddress } from '../../../../../utils/formSpec'
import { emailReady } from '../../../../utils/email'
import { sendResponseCopy } from '../../../../utils/formCopy'
import { now } from '../../../../utils/passcode'
import { sendPushTo } from '../../../../utils/push'
import { administratorIds } from '../../../../utils/infoNotify'
import { noteError } from '../../../../utils/errorReport'
import { parentOfTicket } from '../../../../utils/familyForms'

/** Someone sends a form. Checked against the form's own questions, kept
    encrypted with a copy of them, and the administrators are told. */
export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const db = await useDb()
  const f = (await db.select().from(s.forms).where(eq(s.forms.slug, slug)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Η φόρμα δεν βρέθηκε' })
  if (!isAccepting(f)) throw createError({ statusCode: 410, message: 'Η φόρμα έχει κλείσει' })
  const body = await readBody<any>(event)
  // a field no person sees: only a bot fills it in. It is told all went well.
  if (body?.website) return { ok: true }

  // a handful of sends from one address in a few minutes is plenty
  const who = ipHash(getRequestIP(event, { xForwardedFor: true }) || 'unknown')
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const recent = await db.select({ id: s.formResponses.id }).from(s.formResponses)
    .where(and(eq(s.formResponses.ipHash, who), gt(s.formResponses.createdAt, since)))
  if (recent.length >= 8) throw createError({ statusCode: 429, message: 'Πάρα πολλές υποβολές — δοκιμάστε ξανά σε λίγα λεπτά' })

  const spec = specOf(f)
  const { clean, errors } = checkAnswers(spec, body)
  if (Object.keys(errors).length) throw createError({ statusCode: 422, message: 'Λείπουν ή είναι λάθος κάποιες απαντήσεις', data: { errors } })

  // uploads were sent ahead, each known by a token; the answer claims them —
  // only files uploaded to this form, for this question, and not yet claimed
  // (an answer key is the question's id, with "@2" etc. for a repeated copy)
  const fileIds = new Set(spec.modules.flatMap(m => m.questions).filter(q => q.type === 'file').map(q => q.id))
  const fileKeys = Object.keys(clean.answers).filter(k => fileIds.has(baseId(k)) && Array.isArray(clean.answers[k]))
  const tokens = fileKeys.flatMap(k => clean.answers[k] as string[])
  const waiting = tokens.length
    ? await db.select().from(s.formFiles).where(and(inArray(s.formFiles.token, tokens), eq(s.formFiles.formId, f.id), isNull(s.formFiles.responseId)))
    : []
  const bad: Record<string, string> = {}
  for (const k of fileKeys) {
    const mine = (clean.answers[k] as string[]).map(tk => waiting.find(w => w.token === tk && w.questionId === baseId(k)))
    if (mine.some(x => !x)) bad[k] = 'upload'
    else clean.answers[k] = mine.map(x => `f:${x!.id}`)
  }
  if (Object.keys(bad).length) throw createError({ statusCode: 422, message: 'Κάποιο αρχείο δεν ανέβηκε σωστά — ανεβάστε το ξανά', data: { errors: bad } })
  // the date it was signed is the moment it was sent, by the server's clock
  const sent = now()
  const data = { ...clean, signedAt: clean.signature ? sent : null }

  // opened from a parent's app: kept as theirs, for them to read again
  let parentId = parentOfTicket(body?.k, f.id)
  if (parentId) {
    const p = (await db.select({ isActive: s.parents.isActive }).from(s.parents).where(eq(s.parents.id, parentId)).limit(1))[0]
    if (!p?.isActive) parentId = null
  }
  const [row] = await db.insert(s.formResponses).values({
    formId: f.id, sealed: seal(data), spec: JSON.stringify(spec), ipHash: who, parentId, createdAt: sent
  }).returning({ id: s.formResponses.id })
  if (waiting.length) {
    await db.update(s.formFiles).set({ responseId: row.id, token: null })
      .where(inArray(s.formFiles.id, waiting.map(w => w.id)))
  }

  // the administrators hear of it; the bell names the form, never the answers
  try {
    await sendPushTo(await administratorIds(), {
      // with the number of children (or whatever the form repeats), when it does
      title: 'Νέα υποβολή φόρμας', kind: 'formResponse', refId: row.id,
      body: [f.titleEl, ...repeatGroups(spec).map(g => `${copiesOf(g, clean.repeats)} × ${g.repeat.label}`)].join(' · ')
    })
  } catch (e) { noteError('Φόρμες — ειδοποίηση διαχειριστών', e, { form: f.slug }) }
  // their own copy, by email, when the form sends one — made after the
  // answer, so a slow PDF or mail server never holds up the sent screen
  const copyTo = emailReady() ? emailCopyAddress(spec, clean.answers) : null
  if (copyTo) void sendResponseCopy(row.id, copyTo)
  return { ok: true, thanksTitle: f.thanksTitleEl, thanks: f.thanksEl, at: sent, copyTo, kept: !!parentId }
})
