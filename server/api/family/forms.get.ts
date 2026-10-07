import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { isAccepting } from '../../utils/forms'
import { familyOf, formIsFor, parentSectionsOf } from '../../utils/familyForms'
import { familyChildren } from '../../utils/registrations'

/** A parent's forms: those sent to them that still wait for an answer — from
    them or the other parent of the same child — and those they have sent from
    the app, which they can open again. Another parent's answers are only
    named, never shown. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = await useDb()
  const family = await familyOf(p.id)
  const invites = await db.select().from(s.formInvites).where(inArray(s.formInvites.parentId, family))
  const sent = await db.select({ id: s.formResponses.id, formId: s.formResponses.formId, parentId: s.formResponses.parentId, createdAt: s.formResponses.createdAt })
    .from(s.formResponses).where(inArray(s.formResponses.parentId, family))
  // every form that takes answers and is for this family's sectors (or, from
  // before sectors were chosen, was sent to them) — plus the ones they sent
  const all = await db.select().from(s.forms)
  const invitedTo = (fid: number) => new Set(invites.filter(i => i.formId === fid).map(i => i.parentId))
  const mine = all.filter(f => isAccepting(f) && formIsFor(f, family, p.sectionIds, invitedTo(f.id)))
  const forms = all.filter(f => mine.includes(f) || sent.some(r => r.formId === f.id))
  const names = new Map((family.length > 1 ? await db.select({ id: s.parents.id, name: s.parents.name }).from(s.parents).where(inArray(s.parents.id, family)) : []).map(x => [x.id, x.name]))
  const answered = new Set(sent.map(r => r.formId))
  // a registration waits until every child of theirs it is for is registered
  const regs = await db.select().from(s.registrations)
  const stillToRegister = new Set<number>()
  for (const f of mine.filter(x => x.registrationYear)) {
    const kids = await familyChildren(p.id, f)
    if (kids.some(k => !regs.some(r => r.scoutId === k.id && r.year === f.registrationYear))) stillToRegister.add(f.id)
  }
  return {
    pending: mine
      .filter(f => f.registrationYear ? stillToRegister.has(f.id) : !answered.has(f.id))
      .map(f => ({ f, at: invites.find(i => i.formId === f.id && i.parentId === p.id)?.sentAt || f.parentsSetAt || f.createdAt }))
      .sort((a, b) => b.at.localeCompare(a.at))
      // the sectors it is for, so the page shows it under the right child (null: from before, for the family)
      .map(({ f, at }) => ({ formId: f.id, title: f.titleEl, sentAt: at, closesAt: f.closesAt, sectionIds: parentSectionsOf(f) })),
    done: sent
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(r => ({
        id: r.parentId === p.id ? r.id : null, formId: r.formId, title: forms.find(f => f.id === r.formId)?.titleEl ?? '',
        createdAt: r.createdAt, by: r.parentId === p.id ? null : (names.get(r.parentId!) || '').split(' ')[0] || null
      }))
  }
})
