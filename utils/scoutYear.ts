/* The scout year: September to August. A registration counts for the year
   it was made in, so last year's ticks do not carry over. */

/** The scout year a day falls in, as "2026-27" (Cyprus time). */
export function scoutYear(at = new Date()) {
  const [y, m] = at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' }).split('-').map(Number)
  const start = m >= 9 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
/** As it is written: "2026–27". */
export const scoutYearLabel = (year: string) => String(year || '').replace('-', '–')
export const isScoutYear = (v: unknown) => /^\d{4}-\d{2}$/.test(String(v || ''))
