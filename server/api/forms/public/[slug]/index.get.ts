import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { specOf, isAccepting } from '../../../../utils/forms'
import { parentOfTicket } from '../../../../utils/familyForms'
import { familyChildren } from '../../../../utils/registrations'

/** A form as the public sees it: its questions while it takes answers, only
    its title once it has closed. An administrator previewing it from the app
    sees it either way. */
export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  const db = await useDb()
  const f = (await db.select().from(s.forms).where(eq(s.forms.slug, slug)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Η φόρμα δεν βρέθηκε' })
  let preview = false
  if (getQuery(event).preview) {
    const session = await getUserSession(event).catch(() => null) as any
    const id = session?.user?.id
    if (id) {
      const me = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
      preview = me?.role === 'troop_leader' && me.isActive
    }
  }
  const open = isAccepting(f)
  if (!open && !preview) return { titleEl: f.titleEl, open: false }
  const spec = specOf(f)
  // opened from a parent's app: their children, for a "which child" question
  // to offer — first names and the member's id, nothing more
  const parentId = parentOfTicket(getQuery(event).k, f.id)
  const asksChild = spec.modules.some(m => m.questions.some(q => q.type === 'child'))
  const children = parentId && asksChild
    ? (await familyChildren(parentId, f)).map(k => ({ id: k.id, name: `${k.firstName} ${k.lastName}` }))
    : null
  return { titleEl: f.titleEl, introEl: f.introEl, open, preview, spec, children }
})
