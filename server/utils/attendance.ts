const TZ = 'Asia/Nicosia'

/** Attendance opens on the day of the event and stays open afterwards.

    You cannot mark a register for something that has not happened yet, and
    recording one late is normal — a Βαθμοφόρος writes the names up on the
    night or the morning after. The boundary is the Cyprus calendar day the
    event starts on, not 24 hours before it: an event at 09:00 is markable
    from midnight that morning. */
export function attendanceOpensAt(startsAt: string): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(startsAt)).map(x => [x.type, x.value]))
  // midnight Cyprus time on that date, found by correcting for the offset
  let guess = Date.UTC(+p.year, +p.month - 1, +p.day)
  for (let i = 0; i < 2; i++) {
    const q = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date(guess)).map(x => [x.type, x.value]))
    guess += Date.UTC(+p.year, +p.month - 1, +p.day) - Date.UTC(+q.year, +q.month - 1, +q.day, +q.hour, +q.minute)
  }
  return new Date(guess).toISOString()
}

export function attendanceIsOpen(startsAt: string, nowIso = new Date().toISOString()): boolean {
  return Date.parse(nowIso) >= Date.parse(attendanceOpensAt(startsAt))
}
