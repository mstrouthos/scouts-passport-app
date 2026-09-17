/* Every request carries our own copy of the session as a header, so a phone
   that forgets to send the cookie is still recognised (see
   server/middleware/session-header.ts). */
export default defineNuxtPlugin(() => {
  const orig = globalThis.$fetch
  globalThis.$fetch = orig.create({
    onRequest({ options }) {
      const t = readSessionToken()
      if (!t) return
      const h = new Headers(options.headers as any)
      if (!h.has('x-session')) h.set('x-session', t)
      options.headers = h
    }
  }) as any
})
