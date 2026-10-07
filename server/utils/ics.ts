/** Minimal RFC-5545 ICS generator — no dependency needed for a handful of VEVENTs. */
export type IcsEvent = {
  uid: string, title: string, location?: string | null,
  startsAt: string, endsAt?: string | null, isAllDay?: boolean, description?: string
}

const stamp = (iso: string, allDay?: boolean, plusDays = 0) => {
  const d = new Date(Date.parse(iso) + plusDays * 86400_000)
  // an all-day event's date is the day in Cyprus: one starting at local
  // midnight is still the evening before in UTC
  if (allDay) return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' }).replace(/-/g, '')
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
      // an all-day end is the day after the last (RFC 5545: DTEND is exclusive)
      e.isAllDay ? `DTEND;VALUE=DATE:${stamp(end, true, 1)}` : `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeText(e.title)}`,
      e.location ? `LOCATION:${escapeText(e.location)}` : '',
      e.description ? `DESCRIPTION:${escapeText(e.description)}` : '',
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}
