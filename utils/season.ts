/* The troop's calendar, for the touches that come and go with it: snow at
   Christmas, red eggs at Easter, campfire sparks in the summer camp season —
   and a limited-edition avatar item for each, won only while it lasts.
   Days are counted in Cyprus time, as everything else in the app. */

export type Season = 'christmas' | 'easter' | 'summer'

/** The calendar day in Cyprus, YYYY-MM-DD. */
export function cyprusDay(at: Date = new Date()): string {
  return at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
}

/** Orthodox Easter Sunday of a year (the Julian computus, moved to the
    Gregorian calendar — good for 1900–2099), YYYY-MM-DD. */
export function orthodoxEaster(year: number): string {
  const a = year % 4, b = year % 7, c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  const julian = Date.UTC(year, month - 1, day)
  return new Date(julian + 13 * 86400_000).toISOString().slice(0, 10)
}

const shift = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)

/** The season a day falls in, if any: Christmas from 1 December to
    7 January; Easter from Lazarus Saturday to Thomas Sunday (it wins when it
    falls in May); summer from May to September. */
export function seasonOn(day: string): Season | null {
  const [y, m, d] = day.split('-').map(Number)
  if (m === 12 || (m === 1 && d <= 7)) return 'christmas'
  const easter = orthodoxEaster(y)
  if (day >= shift(easter, -8) && day <= shift(easter, 7)) return 'easter'
  if (m >= 5 && m <= 9) return 'summer'
  return null
}

/** The season right now — or, in a hidden test account's browser, the one
    it is trying out (composables/season.ts keeps it for the visit). Only
    ever cosmetic: what can be won is decided on the server by the date. */
export function currentSeason(at: Date = new Date()): Season | null {
  if (typeof window !== 'undefined') {
    try {
      const p = sessionStorage.getItem('season')
      if (p === 'christmas' || p === 'easter' || p === 'summer') return p
    } catch {}
  }
  return seasonOn(cyprusDay(at))
}

/** Whether today is someone's birthday (YYYY-MM-DD stored), in Cyprus time;
    29 February is kept on 28 February in other years. */
export function isBirthday(birthday: string | null | undefined, at: Date = new Date()): boolean {
  const b = String(birthday || '').match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!b) return false
  const today = cyprusDay(at)
  const [y, m, d] = today.split('-').map(Number)
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  const bm = +b[1], bd = +b[2] === 29 && +b[1] === 2 && !leap ? 28 : +b[2]
  return bm === m && bd === d
}

/** A first name as you call someone by it (κλητική): Νίκος → Νίκο,
    Γιάννης → Γιάννη, Κώστας → Κώστα; a name that does not change is left. */
export function vocative(name: string): string {
  const n = String(name || '').trim()
  const m = n.match(/^(.*[^\s])(ος|ός|ης|ής|ας|άς)$/)
  return m ? m[1] + m[2][0] : n
}
