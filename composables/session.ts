export type Me = {
  id: number, firstName: string, lastName: string,
  firstNameEn?: string | null, lastNameEn?: string | null,
  role: 'scout' | 'leader' | 'troop_leader', locale: string, isChief?: boolean, rank?: string | null,
  patrol?: { id: number, nameEl: string, nameEn?: string | null, emblem: string } | null,
  section?: { id: number, nameEl: string, nameEn?: string | null, slug?: string | null } | null,
  scopePatrols?: Array<{ id: number, nameEl: string, nameEn?: string | null, emblem: string }> | null,
  scopeSections?: Array<{ id: number, nameEl: string, nameEn?: string | null, slug?: string | null, hasApp?: boolean }> | null
}

export const useMe = () => useState<Me | null>('me', () => null)
/* Why the last loadMe failed: signed out for real, or merely unreachable.
   The two must not be confused — an installed app that opens on a dead
   cellular radio, or during a deploy, is NOT signed out, and bouncing it to
   the passcode screen is what made people say "it keeps logging me out". */
export const useMeError = () => useState<'unauth' | 'network' | null>('meError', () => null)
/* The server's stated reason for a 401, shown small on the passcode screen. */
export const useMeWhy = () => useState<string | null>('meWhy', () => null)
/* Whether the current `me` came from the last good answer rather than the
   server just now — shown offline, refreshed when the server is back. */
export const useMeStale = () => useState<boolean>('meStale', () => false)

const CACHE = 'me-cache'
function readCache(): Me | null {
  try { const raw = localStorage.getItem(CACHE); return raw ? JSON.parse(raw) : null } catch { return null }
}
function writeCache(me: Me | null) {
  try { me ? localStorage.setItem(CACHE, JSON.stringify(me)) : localStorage.removeItem(CACHE) } catch {}
}

export async function loadMe(): Promise<Me | null> {
  const me = useMe(), err = useMeError(), stale = useMeStale()
  try {
    me.value = await $fetch<Me>('/api/me')
    err.value = null; stale.value = false
    writeCache(me.value)
    // keep our own copy of the session for phones that drop the cookie
    await ensureSessionToken()
    const { locale, setLocale } = useNuxtApp().$i18n as any
    if (me.value && me.value.locale !== locale.value) await setLocale(me.value.locale)
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode ?? 0
    if (status === 401 || status === 403) {
      // the server heard us and said no: truly signed out
      me.value = null; err.value = 'unauth'; stale.value = false; writeCache(null)
      if (import.meta.client) writeSessionToken(null)
      useMeWhy().value = e?.data?.data?.why || e?.response?._data?.data?.why || `http-${status}`
    } else {
      // no answer (offline, deploy in progress, timeout): carry on with what
      // we knew, and try again shortly
      err.value = 'network'
      const cached = readCache()
      if (cached) { me.value = cached; stale.value = true }
      else me.value = null
    }
  }
  return me.value
}

/** Keep trying, quietly, until the server answers — used while `me` is stale. */
export function retryMeUntilFresh() {
  const stale = useMeStale()
  if (!import.meta.client) return
  const tick = async () => {
    if (!stale.value) return
    await loadMe()
    if (stale.value) setTimeout(tick, 8000)
  }
  setTimeout(tick, 4000)
}

/** Pick the localized variant of a { xEl / xEn } pair, falling back to Greek. */
export function useLx() {
  const { locale } = useI18n()
  return (obj: any, key = 'title'): string => {
    if (!obj) return ''
    const el = obj[key + 'El'] ?? obj[key] ?? ''
    const en = obj[key + 'En']
    return (locale.value === 'en' && en) ? en : el
  }
}

export function useName() {
  const { locale } = useI18n()
  return (r: any): string => {
    if (!r) return ''
    if (locale.value === 'en' && r.firstNameEn) return `${r.firstNameEn} ${r.lastNameEn || ''}`.trim()
    return `${r.firstName} ${r.lastName || ''}`.trim()
  }
}

export function useToast() {
  const msg = useState<string | null>('toast', () => null)
  let timer: any
  const show = (text: string, ms = 2200) => {
    msg.value = text
    clearTimeout(timer)
    timer = setTimeout(() => { msg.value = null }, ms)
  }
  return { msg, show }
}

export function fmtDay(iso: string, locale: string) {
  const d = new Date(iso)
  return { d: d.getDate(), m: d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR', { month: 'short' }).replace('.', '') }
}
export function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toTimeString().slice(0, 5)
}
/** An event is over once its end has passed — the end time if it has one,
    otherwise the end of its (start) day. Not a moment sooner: a meeting still
    running is not history. */
export function eventEnded(e: { startsAt: string; endsAt?: string | null; isAllDay?: boolean | null }, now = Date.now()) {
  if (e.endsAt && !e.isAllDay) return new Date(e.endsAt).getTime() <= now
  const d = new Date(e.endsAt || e.startsAt)
  d.setHours(23, 59, 59, 999)
  return d.getTime() <= now
}
/** When an event runs, start to end: "10:00 – 12:30" on one day,
    "13 Σεπ 10:00 – 15 Σεπ 12:30" across days, or the days alone if all-day. */
export function fmtSpan(e: { startsAt: string; endsAt?: string | null; isAllDay?: boolean | null }, locale: string, allDay: string) {
  const lc = locale === 'en' ? 'en-GB' : 'el-GR'
  const day = (iso: string) => new Date(iso).toLocaleDateString(lc, { day: 'numeric', month: 'short' }).replace('.', '')
  const sameDay = !e.endsAt || new Date(e.startsAt).toDateString() === new Date(e.endsAt).toDateString()
  if (e.isAllDay) return sameDay ? allDay : `${day(e.startsAt)} – ${day(e.endsAt!)}`
  if (sameDay) return `${fmtTime(e.startsAt)}${e.endsAt ? ' – ' + fmtTime(e.endsAt) : ''}`
  return `${day(e.startsAt)} ${fmtTime(e.startsAt)} – ${day(e.endsAt!)} ${fmtTime(e.endsAt!)}`
}
export function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR', { day: 'numeric', month: 'short', year: 'numeric' })
}
