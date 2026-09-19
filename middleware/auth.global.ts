export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  // /install is linked from the SMS that carries someone's code, so it has to
  // be readable before they can sign in
  const open = to.path === '/' || to.path === '/login' || to.path === '/install'
    || to.path.startsWith('/family') || to.path.startsWith('/bar') || to.path.startsWith('/t/')
  // someone already signed in has no business on the passcode screen
  if (to.path === '/login') {
    const me = useMe()
    if (!me.value) await loadMe()
    if (me.value) return navigateTo(me.value.role === 'scout' ? '/app' : '/admin', { replace: true })
    return
  }
  if (open) return
  const me = useMe()
  if (!me.value) await loadMe()
  if (!me.value) {
    // only a real "no" sends anyone to the passcode screen; a server we could
    // not reach and no memory of who this is gets the "updating" page instead
    if (useMeError().value === 'network') throw createError({ statusCode: 503, statusMessage: 'Η εφαρμογή ενημερώνεται', fatal: true })
    return navigateTo('/login')
  }
  if (useMeStale().value) retryMeUntilFresh()
  const isLeader = me.value.role !== 'scout'
  if (to.path.startsWith('/admin') && !isLeader) return navigateTo('/app')
  if (to.path.startsWith('/app') && isLeader) return navigateTo('/admin')
})
