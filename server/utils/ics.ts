/** Minimal RFC-5545 ICS generator — no dependency needed for a handful of VEVENTs. */
export type IcsEvent = {
  uid: string, title: string, location?: string | null,
  startsAt: string, endsAt?: string | null, isAllDay?: boolean, description?: string
}

const stamp = (iso: string, allDay?: boolean) => {
  const d = new Date(iso)
  if (allDay) return d.toISOString().slice(0, 10).replace(/-/g, '')
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}
const escapeText = (s: string) => s.replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n')

export function buildIcs(events: IcsEvent[], calName: string): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scout Passport//EL',
    'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeText(calName)}`
  ]
  for (const e of events) {
    const end = e.endsAt || e.startsAt
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@scout-passport`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      e.isAllDay ? `DTSTART;VALUE=DATE:${stamp(e.startsAt, true)}` : `DTSTART:${stamp(e.startsAt)}`,
      e.isAllDay ? `DTEND;VALUE=DATE:${stamp(end, true)}` : `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeText(e.title)}`,
      e.location ? `LOCATION:${escapeText(e.location)}` : '',
      e.description ? `DESCRIPTION:${escapeText(e.description)}` : '',
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}
