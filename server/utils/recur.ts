/** The next time a repeating notification is due, keeping the same wall-clock
    time in Cyprus across the clock change — "every day at 18:00" stays 18:00
    when summer time ends, and the 31st of a short month lands on its last day. */
const TZ = 'Asia/Nicosia'
export type Repeat = 'daily' | 'weekly' | 'monthly' | 'yearly'

function wall(iso: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date(iso)).map(x => [x.type, x.value]))
  return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, mi: +parts.minute }
}
/** The instant of a Cyprus wall-clock time, found by correcting for the offset twice. */
function instant(y: number, m: number, d: number, h: number, mi: number): Date {
  let guess = Date.UTC(y, m - 1, d, h, mi)
  for (let i = 0; i < 2; i++) {
    const w = wall(new Date(guess).toISOString())
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi)
    guess += Date.UTC(y, m - 1, d, h, mi) - asUtc
  }
  return new Date(guess)
}
export function nextOccurrence(iso: string, repeat: Repeat): string {
  const w = wall(iso)
  let y = w.y, m = w.m, d = w.d
  if (repeat === 'daily') { const t = new Date(Date.UTC(y, m - 1, d + 1)); y = t.getUTCFullYear(); m = t.getUTCMonth() + 1; d = t.getUTCDate() }
  else if (repeat === 'weekly') { const t = new Date(Date.UTC(y, m - 1, d + 7)); y = t.getUTCFullYear(); m = t.getUTCMonth() + 1; d = t.getUTCDate() }
  else if (repeat === 'monthly') { m += 1; if (m > 12) { m = 1; y += 1 } }
  else { y += 1 }
  // clamp to the month's last day: 31 Jan → 28/29 Feb, 29 Feb → 28 Feb next year
  d = Math.min(d, new Date(Date.UTC(y, m, 0)).getUTCDate())
  return instant(y, m, d, w.h, w.mi).toISOString()
}
