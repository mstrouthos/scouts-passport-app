import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { isAccepting, canManageForm, isArchigosFor, formSections } from '../../utils/forms'

/** The forms this Βαθμοφόρος handles — their sectors' (every one, for the
    administrators) — with how many answers each has and how many are new,
    and which wait for approval. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const responses = await db.select({ formId: s.formResponses.formId, isRead: s.formResponses.isRead }).from(s.formResponses)
  const sections = new Map((await db.select().from(s.sections)).map(x => [x.id, x.nameEl]))
  const secs = await formSections(me)
  const out = []
  for (const f of (await db.select().from(s.forms)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!(await canManageForm(me, f))) continue
    out.push({
      id: f.id, slug: f.slug, titleEl: f.titleEl, isOpen: f.isOpen, closesAt: f.closesAt, accepting: isAccepting(f),
      createdAt: f.createdAt, section: f.sectionId ? sections.get(f.sectionId) ?? null : null,
      pendingApproval: f.pendingApproval, canApprove: f.pendingApproval && await isArchigosFor(me, f.sectionId),
      responses: responses.filter(r => r.formId === f.id).length,
      unread: responses.filter(r => r.formId === f.id && !r.isRead).length
    })
  }
  return {
    forms: out,
    // where a new form may go: the whole troop only for those who run it all
    sections: [...sections.entries()].filter(([id]) => secs === null || secs.includes(id)).map(([id, nameEl]) => ({ id, nameEl })),
    allSections: secs === null
  }
})
