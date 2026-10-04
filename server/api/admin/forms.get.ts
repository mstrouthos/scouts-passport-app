import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'
import { isAccepting } from '../../utils/forms'

/** Every form, with how many answers it has and how many are new. Forms and
    their answers are for administrators only. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const db = await useDb()
  const responses = await db.select({ formId: s.formResponses.formId, isRead: s.formResponses.isRead }).from(s.formResponses)
  return (await db.select().from(s.forms))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(f => ({
      id: f.id, slug: f.slug, titleEl: f.titleEl, isOpen: f.isOpen, closesAt: f.closesAt, accepting: isAccepting(f),
      createdAt: f.createdAt,
      responses: responses.filter(r => r.formId === f.id).length,
      unread: responses.filter(r => r.formId === f.id && !r.isRead).length
    }))
})
