import { and, eq, gt } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { specOf, isAccepting } from '../../../utils/forms'
import { seal, ipHash } from '../../../utils/seal'
import { checkAnswers } from '../../../../utils/formSpec'
import { now } from '../../../utils/passcode'
import { sendPushTo } from '../../../utils/push'
import { administratorIds } from '../../../utils/infoNotify'

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

  const [row] = await db.insert(s.formResponses).values({
    formId: f.id, sealed: seal(clean), spec: JSON.stringify(spec), ipHash: who, createdAt: now()
  }).returning({ id: s.formResponses.id })

  // the administrators hear of it; the bell names the form, never the answers
  try {
    await sendPushTo(await administratorIds(), {
      title: 'Νέα υποβολή φόρμας', body: f.titleEl, kind: 'formResponse', refId: row.id
    })
  } catch (e) { console.warn('[forms] could not notify administrators', e) }
  return { ok: true, thanks: f.thanksEl }
})
