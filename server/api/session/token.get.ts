/** The sealed session as a string, for the client to keep alongside the
    cookie — the same blob, so it expires and invalidates identically. */
export default defineEventHandler(async (event) => {
  const session: any = await getUserSession(event)
  if (!session?.user?.id && !session?.parent?.id && !session?.bar?.staffId)
    throw createError({ statusCode: 401, message: 'Not signed in' })
  // re-issue so the Set-Cookie carries the current sealed value, then read it back
  await setUserSession(event, {})
  const set = getResponseHeader(event, 'set-cookie')
  const raw = (Array.isArray(set) ? set : [set]).map(String).find(x => x.startsWith('nuxt-session='))
  const token = raw ? decodeURIComponent(raw.slice('nuxt-session='.length).split(';')[0]) : null
  if (!token) throw createError({ statusCode: 500, message: 'No session to hand over' })
  return { token }
})
