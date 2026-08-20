export type Me = {
  id: number, firstName: string, lastName: string,
  firstNameEn?: string | null, lastNameEn?: string | null,
  role: 'scout' | 'leader' | 'troop_leader', locale: string,
  patrol?: { id: number, nameEl: string, nameEn?: string | null, emblem: string } | null,
  section?: { id: number, nameEl: string, nameEn?: string | null, slug?: string | null } | null,
  scopePatrols?: Array<{ id: number, nameEl: string, nameEn?: string | null, emblem: string }> | null,
  scopeSections?: Array<{ id: number, nameEl: string, nameEn?: string | null, slug?: string | null, hasApp?: boolean }> | null
}

export const useMe = () => useState<Me | null>('me', () => null)

export async function loadMe(): Promise<Me | null> {
  const me = useMe()
  try {
    me.value = await $fetch<Me>('/api/me')
    const { locale, setLocale } = useNuxtApp().$i18n as any
    if (me.value && me.value.locale !== locale.value) await setLocale(me.value.locale)
  } catch {
    me.value = null
  }
  return me.value
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
export function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR', { day: 'numeric', month: 'short', year: 'numeric' })
}
