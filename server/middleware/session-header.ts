import { unsealSession } from 'h3'

/* Some phones — installed iOS web apps above all — open the app without a
   usable session cookie: none at all, an emptied one, or one the server can
   no longer read. The client keeps its own copy of the sealed session and
   sends it as a header; when the cookie will not do, the header is put where
   the session code looks. Same sealed, expiring blob — nothing is weakened. */
export default defineEventHandler(async (event) => {
  const header = getHeader(event, 'x-session')
  if (!header) return
  const cookie = getHeader(event, 'cookie') || ''
  const m = cookie.match(/(?:^|;\s*)nuxt-session=([^;]*)/)
  const value = m ? decodeURIComponent(m[1]) : ''
  if (value) {
    // a cookie the server can read wins; only a dead one gives way
    const cfg = useRuntimeConfig(event) as any
    const password = process.env.NUXT_SESSION_PASSWORD || cfg.session?.password
    try {
      const data: any = await unsealSession(event, { password, maxAge: cfg.session?.maxAge } as any, value)
      // h3 hands out a blank session cookie to any request that arrives
      // without one — after which the phone holds a readable cookie that
      // names nobody. That is not a session worth keeping over the header.
      const d = data?.data || {}
      if (d.user?.id || d.parent?.id || d.bar?.staffId) return
    } catch {}
  }
  const rest = cookie.split(';').map(x => x.trim()).filter(x => x && !x.startsWith('nuxt-session='))
  event.node.req.headers.cookie = [...rest, 'nuxt-session=' + header].join('; ')
})
