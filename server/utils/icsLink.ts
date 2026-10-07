import { createHmac, timingSafeEqual } from 'node:crypto'

/* One event's .ics behind a signed address, so it opens without a sign-in.
   The phone's calendar — or, in an installed app on iOS, the browser sheet
   it opens links in — does not carry the app's session; a plain
   /api/calendar.ics?event= would be refused there, and nothing happened. The
   signature names only that one event. */
const sig = (id: number) => createHmac('sha256', String(useRuntimeConfig().passcodePepper)).update('ics:' + id).digest('base64url').slice(0, 16)

export const icsPath = (id: number) => `/api/ics/${id}-${sig(id)}.ics`

/** The event a signed file name stands for, or null. */
export function icsEventId(file: string): number | null {
  const m = /^(\d+)-([A-Za-z0-9_-]{16})(?:\.ics)?$/.exec(file)
  if (!m) return null
  const id = Number(m[1]), want = Buffer.from(sig(id)), got = Buffer.from(m[2])
  return want.length === got.length && timingSafeEqual(want, got) ? id : null
}
