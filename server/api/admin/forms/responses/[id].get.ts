import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { responseAccess } from '../../../../utils/forms'
import { logAccess } from '../../../../utils/forms'
import { unseal } from '../../../../utils/seal'
import { normalizeSpec } from '../../../../../utils/formSpec'
import { filesOfResponse } from '../../../../utils/formFiles'
import { childrenOfResponse, registrationOptions, registrationPool, typedChildren } from '../../../../utils/registrations'
import { nameScore, suggestions } from '../../../../utils/nameMatch'

/** One answer in full, with the questions as they were when it was sent.
    Opening it marks it read, and is recorded. An Αρχηγός who only reads it
    (a registration of a child of their sector) sees this one answer and no
    more: no stepping to the others, no linking, and it stays unread for
    those who manage the form. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = await useDb()
  const r = (await db.select().from(s.formResponses).where(eq(s.formResponses.id, id)).limit(1))[0]
  if (!r) throw createError({ statusCode: 404, message: 'Not found' })
  const f = (await db.select().from(s.forms).where(eq(s.forms.id, r.formId)).limit(1))[0]
  const access = f ? await responseAccess(me, f, id) : null
  if (!f || !access) throw createError({ statusCode: 404, message: 'Not found' })
  const manage = access === 'manage'
  if (!r.isRead && manage) await db.update(s.formResponses).set({ isRead: true }).where(eq(s.formResponses.id, id))
  await logAccess(r.formId, me.id, 'view', id)
  // newer and older neighbours, to step through them without going back
  const ids = !manage ? [id] : (await db.select({ id: s.formResponses.id, createdAt: s.formResponses.createdAt })
    .from(s.formResponses).where(eq(s.formResponses.formId, r.formId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(x => x.id)
  const at = ids.indexOf(id)
  // sent by a parent from their app: named, so the leaders know whose it is
  const parent = r.parentId ? (await db.select({ name: s.parents.name }).from(s.parents).where(eq(s.parents.id, r.parentId)).limit(1))[0] : null
  // a registration: the children it registers, and those it could
  const registration = f.registrationYear ? await (async () => {
    const linked = await childrenOfResponse(id)
    if (!manage) return { year: f.registrationYear, children: linked.map(k => ({ id: k.id, name: `${k.firstName} ${k.lastName}`, auto: k.auto })), typed: [], options: [] }
    const data = unseal(r.sealed)
    const options = await registrationOptions(me, f)
    const pool = (await registrationPool(f)).filter(c => options.some(o => o.id === c.id))
    // each child name typed (by plain link): is it linked yet, and if not, who it may be
    const typed = typedChildren(normalizeSpec(JSON.parse(r.spec)), data.answers || {}).map(x => {
      const to = linked.find(k => nameScore(x.name, k, null) >= 0.82)
      return {
        name: x.name, linkedTo: to?.id ?? null,
        suggestions: to ? [] : suggestions(x.name, pool, x.dob).slice(0, 3)
          .map(sg => ({ id: sg.c.id, name: `${sg.c.firstName} ${sg.c.lastName}`, section: options.find(o => o.id === sg.c.id)?.section ?? '', sure: Math.round(sg.score * 100) }))
      }
    })
    return {
      year: f.registrationYear,
      children: linked.map(k => ({ id: k.id, name: `${k.firstName} ${k.lastName}`, auto: k.auto })),
      typed, options
    }
  })() : null
  return {
    canManage: manage,
    registration,
    fromParent: parent?.name ?? null,
    id: r.id, formId: r.formId, formTitle: f?.titleEl ?? '', createdAt: r.createdAt,
    spec: normalizeSpec(JSON.parse(r.spec)), data: unseal(r.sealed),
    files: Object.fromEntries(Object.entries(await filesOfResponse(id))
      .map(([k, f]) => [k, { id: f.id, name: f.name, mime: f.mime, size: f.size }])),
    newer: at > 0 ? ids[at - 1] : null, older: at >= 0 && at < ids.length - 1 ? ids[at + 1] : null,
    position: at + 1, total: ids.length
  }
})
