/** How much fun a day holds: enough for a laugh, never a flood. */
export const FUN_LIMIT_DAY = 10
/** …and at most this many at any one person in a day */
export const FUN_PER_TARGET_DAY = 3
/** The same thing at the same person again only after a short breath. */
export const FUN_COOLDOWN_MS = 20_000
/** No buzzing phones at night (Cyprus time): it waits in the bell instead. */
export const isQuietHour = (at = new Date()) => {
  const h = Number(at.toLocaleString('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', hour12: false }))
  return h >= 22 || h < 8
}
/** The start of today in Cyprus, as an ISO instant. */
export function cyprusDayStart(at = new Date()) {
  const day = at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
  // Cyprus is UTC+2 or +3; the earlier bound keeps "today" whole either way
  return new Date(Date.parse(`${day}T00:00:00Z`) - 3 * 3600_000).toISOString()
}

/** A phone buzzes for the first in an hour; the rest wait in the bell. */
export const FUN_PUSH_GAP_MS = 60 * 60_000

/** Whether the Αρχηγός Συστήματος has paused the playground. */
export async function funPaused() {
  const { eq } = await import('drizzle-orm')
  const { useDb, schema: s } = await import('../db')
  const db = await useDb()
  return (await db.select().from(s.settings).where(eq(s.settings.key, 'fun.paused')))[0]?.value === '1'
}
