export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  // /install is linked from the SMS that carries someone's code, so it has to
  // be readable before they can sign in
  const open = to.path === '/' || to.path === '/login' || to.path === '/install'
    || to.path.startsWith('/family')
  if (open) return
  const me = useMe()
  if (!me.value) await loadMe()
  if (!me.value) return navigateTo('/login')
  const isLeader = me.value.role !== 'scout'
  if (to.path.startsWith('/admin') && !isLeader) return navigateTo('/app')
  if (to.path.startsWith('/app') && isLeader) return navigateTo('/admin')
})
