import { idParam } from '../../../../utils/guard'
import { requireParent } from '../../../../utils/parentGuard'
import { formById, isAccepting } from '../../../../utils/forms'
import { formLink, parentTicket } from '../../../../utils/familyForms'

/** The address a parent opens a form at, with their ticket on it. Asked for
    from the app, so it works on phones that sign in with a header rather
    than a cookie. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const f = await formById(idParam(event))
  if (!isAccepting(f)) throw createError({ statusCode: 410, message: 'Η φόρμα έχει κλείσει' })
  return { url: formLink(event, f.slug, parentTicket(p.id, f.id)) }
})
