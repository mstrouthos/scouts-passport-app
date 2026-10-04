/* forms.scouts30.org is the same app, opened from a different door: the one
   anyone with a form's link comes through. Through that door there is the
   form and nothing else — no admin pages, no data, no sign-in, and no app to
   install. Everything but the public forms' own two endpoints is refused here,
   on the server, so no mistake elsewhere in the app can be reached from it. */
export const isFormsHost = (host: string) => /^forms\./i.test(host)

export default defineEventHandler((event) => {
  const host = getRequestHost(event, { xForwardedHost: true }) || ''
  if (!isFormsHost(host)) return
  const path = (event.path || '/').split('?')[0]
  if (path.startsWith('/api/')) {
    if (path.startsWith('/api/forms/public/')) return
    throw createError({ statusCode: 404, message: 'Not found' })
  }
  // the members' app is not installable from here: no service worker, no manifest
  if (/^\/(sw\.js|push-sw\.js|surface-sw\.js|workbox-[^/]*\.js|manifest\.webmanifest|bar\.webmanifest|family\.webmanifest)$/.test(path))
    throw createError({ statusCode: 404, message: 'Not found' })
  // a form is not for search engines
  setHeader(event, 'x-robots-tag', 'noindex, nofollow')
})
