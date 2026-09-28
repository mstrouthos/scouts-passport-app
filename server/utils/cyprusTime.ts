/* Wall-clock times in Cyprus, whatever time zone the server itself runs in. */
const TZ = 'Asia/Nicosia'
const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
})

/** How far Cyprus is ahead of UTC at a given instant, in ms (+2h or +3h). */
function offsetAt(ms: number): number {
  const p = Object.fromEntries(parts.formatToParts(new Date(ms)).map(x => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000
}

/** The instant it is hh:mm in Cyprus, on the Cyprus calendar day that `iso` falls on. */
export function cyprusTimeOnDayOf(iso: string, hh: number, mm = 0): string {
  const at = Date.parse(iso)
  const p = Object.fromEntries(parts.formatToParts(new Date(at)).map(x => [x.type, x.value]))
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, hh, mm)
  // first guess with the offset of the day's start, then correct once in case
  // the clocks change in between
  let ms = wall - offsetAt(at)
  ms = wall - offsetAt(ms)
  return new Date(ms).toISOString()
}
