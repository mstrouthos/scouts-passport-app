import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { isAccepting } from '../../utils/forms'
import { familyOf } from '../../utils/familyForms'

/** A parent's forms: those sent to them that still wait for an answer — from
    them or the other parent of the same child — and those they have sent from
    the app, which they can open again. Another parent's answers are only
    named, never shown. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = await useDb()
  const family = await familyOf(p.id)
  const invites = await db.select().from(s.formInvites).where(eq(s.formInvites.parentId, p.id))
  const sent = await db.select({ id: s.formResponses.id, formId: s.formResponses.formId, parentId: s.formResponses.parentId, createdAt: s.formResponses.createdAt })
    .from(s.formResponses).where(inArray(s.formResponses.parentId, family))
  const formIds = [...new Set([...invites.map(i => i.formId), ...sent.map(r => r.formId)])]
  const forms = formIds.length ? await db.select().from(s.forms).where(inArray(s.forms.id, formIds)) : []
  const names = new Map((family.length > 1 ? await db.select({ id: s.parents.id, name: s.parents.name }).from(s.parents).where(inArray(s.parents.id, family)) : []).map(x => [x.id, x.name]))
  const answered = new Set(sent.map(r => r.formId))
  return {
    pending: invites
      .map(i => ({ i, f: forms.find(f => f.id === i.formId) }))
      .filter(({ i, f }) => f && isAccepting(f) && !answered.has(i.formId))
      .sort((a, b) => b.i.sentAt.localeCompare(a.i.sentAt))
      .map(({ i, f }) => ({ formId: f!.id, title: f!.titleEl, sentAt: i.sentAt, closesAt: f!.closesAt })),
    done: sent
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(r => ({
        id: r.parentId === p.id ? r.id : null, formId: r.formId, title: forms.find(f => f.id === r.formId)?.titleEl ?? '',
        createdAt: r.createdAt, by: r.parentId === p.id ? null : (names.get(r.parentId!) || '').split(' ')[0] || null
      }))
  }
})
