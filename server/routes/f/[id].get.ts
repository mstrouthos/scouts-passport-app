import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'

/** /f/12: a form sent to the families in the app opens on the forms site,
    under its own link (or here, on a test machine without that site). */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const f = Number.isInteger(id) ? (await (await useDb()).select().from(s.forms).where(eq(s.forms.id, id)).limit(1))[0] : null
  if (!f) return sendRedirect(event, '/family', 302)
  const host = getRequestHost(event, { xForwardedHost: true }) || ''
  const onSite = /(^|\.)scouts30\.org$/.test(host.split(':')[0])
  return sendRedirect(event, onSite ? `https://forms.scouts30.org/${encodeURIComponent(f.slug)}` : `/forms/${encodeURIComponent(f.slug)}`, 302)
})
