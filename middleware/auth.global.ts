export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const open = to.path === '/' || to.path === '/login' || to.path.startsWith('/family')
  if (open) return
  const me = useMe()
  if (!me.value) await loadMe()
  if (!me.value) return navigateTo('/login')
  const isLeader = me.value.role !== 'scout'
  if (to.path.startsWith('/admin') && !isLeader) return navigateTo('/app')
  if (to.path.startsWith('/app') && isLeader) return navigateTo('/admin')
})
