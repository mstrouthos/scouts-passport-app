import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { formLink, parentTicket } from '../../utils/familyForms'

/** /f/12: a form sent to the families in the app opens on the forms site,
    under its own link (or here, on a test machine without that site) — with
    the parent's ticket when they are signed in, so the answer is kept as theirs. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const f = Number.isInteger(id) ? (await (await useDb()).select().from(s.forms).where(eq(s.forms.id, id)).limit(1))[0] : null
  if (!f) return sendRedirect(event, '/family', 302)
  const session = await getUserSession(event).catch(() => null) as any
  const parentId = Number(session?.parent?.id) || null
  return sendRedirect(event, formLink(event, f.slug, parentId ? parentTicket(parentId, f.id) : undefined), 302)
})
