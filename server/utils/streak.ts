/** Streaks are counted in the troop's own calendar days, not UTC — answering
    at 01:00 Cyprus time must count for that day, and the Monday→Sunday week
    that earns the bonus is a local week. */
const TZ = 'Asia/Nicosia'
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** An instant → its local calendar day, e.g. "2026-08-21". */
export function localDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return Number.isNaN(d.getTime()) ? '' : fmt.format(d)
}

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000)

/** 0 = Monday … 6 = Sunday, for a local day string. */
export function weekdayOf(day: string): number {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7
}

/** Consecutive local days answered, counting back from today (or yesterday, so
    a streak is not declared broken until the day is actually over). */
export function currentStreak(days: Iterable<string>, today = localDay(new Date())): number {
  const set = new Set(days)
  if (!set.size) return 0
  const t = dayNumber(today)
  // start from today if answered, otherwise yesterday — mid-day gaps are fine
  let cursor = set.has(today) ? t : t - 1
  if (!set.has(dayFromNumber(cursor))) return 0
  let n = 0
  while (set.has(dayFromNumber(cursor))) { n++; cursor-- }
  return n
}

function dayFromNumber(n: number): string {
  return new Date(n * 86400000).toISOString().slice(0, 10)
}

/** Every local day of the Mon–Sun week that `day` falls in. */
export function weekDays(day: string): string[] {
  const start = dayNumber(day) - weekdayOf(day)
  return Array.from({ length: 7 }, (_, i) => dayFromNumber(start + i))
}

/** The bonus is earned by answering on every day of the current Mon–Sun week,
    and is only offered on the Sunday itself. */
export function bonusEarned(days: Iterable<string>, today = localDay(new Date())): boolean {
  if (weekdayOf(today) !== 6) return false          // Sunday only
  const set = new Set(days)
  return weekDays(today).every(d => set.has(d))
}
