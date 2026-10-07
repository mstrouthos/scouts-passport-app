import { idParam } from '../../../../utils/guard'
import { requireParent } from '../../../../utils/parentGuard'
import { formById, isAccepting } from '../../../../utils/forms'
import { formLink, parentTicket, familyOf, formIsFor } from '../../../../utils/familyForms'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'

/** The address a parent opens a form at, with their ticket on it. Asked for
    from the app, so it works on phones that sign in with a header rather
    than a cookie. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const f = await formById(idParam(event))
  // only a form that was sent to them (or to the other parent of their child)
  const db = await useDb()
  const family = await familyOf(p.id)
  const invited = new Set((await db.select().from(s.formInvites).where(eq(s.formInvites.formId, f.id))).map(i => i.parentId))
  if (!formIsFor(f, family, p.sectionIds, invited)) throw createError({ statusCode: 404, message: 'Η φόρμα δεν βρέθηκε' })
  if (!isAccepting(f)) throw createError({ statusCode: 410, message: 'Η φόρμα έχει κλείσει' })
  return { url: formLink(event, f.slug, parentTicket(p.id, f.id)) }
})
