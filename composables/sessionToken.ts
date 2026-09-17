/* Our own copy of the sealed session, kept in storage and sent as a header,
   for phones that forget to send the cookie (installed iOS web apps have
   been seen doing this). Same blob as the cookie, same expiry. */
const KEY = 'session-token'
export function readSessionToken(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export function writeSessionToken(t: string | null) {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY) } catch {}
}
/** Fetch and keep the token if we do not already hold one — call after any sign-in. */
export async function ensureSessionToken() {
  if (!import.meta.client || readSessionToken()) return
  try { const { token } = await $fetch<{ token: string }>('/api/session/token'); writeSessionToken(token) } catch {}
}
