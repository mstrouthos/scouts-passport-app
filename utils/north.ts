/* Πού είναι ο Βορράς; — once a day, five seconds to point the phone the way
   the day asks, scored by how far off it was. At first that was always north;
   from NORTH_RANDOM_FROM each day has a bearing of its own, the same for
   everyone, so that knowing where north is in your own room does not win it.
   Shared by the page and the server. */

/** Seconds to turn, after a 3-2-1. */
export const NORTH_SECS = 5
/** Phones point to magnetic north; true north, in Cyprus, is about 5° west of
    it (the declination is about 5° east). The game scores against true north. */
export const NORTH_DECLINATION = 5
/** Full marks within this; it is a bullseye. */
export const NORTH_BULLSEYE = 3
/** At this far off, or more, nothing. */
export const NORTH_ZERO_AT = 60

/** The first day whose bearing is not north (a day begun with north stays north). */
export const NORTH_RANDOM_FROM = '2026-10-10'
/** The day's bearing, in whole degrees from true north, clockwise (90 east):
    north until NORTH_RANDOM_FROM, then one drawn from the day itself — never
    within 15° of north, which would be the old game again. */
export function northTarget(day: string): number {
  if (day < NORTH_RANDOM_FROM) return 0
  let h = 2166136261
  for (const ch of `north:${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h = (h ^ (h >>> 16)) >>> 0
  return 15 + h % 331
}

/** Where the phone pointed (magnetic) against the day's bearing (true):
    −180…180, clockwise (right) positive. */
export function northError(magneticHeading: number, target = 0): number {
  let e = ((magneticHeading + NORTH_DECLINATION - target) % 360 + 360) % 360
  if (e > 180) e -= 360
  return Math.round(e * 10) / 10
}
/** 100 spot on, falling evenly to 0 at 60° off. */
export const northPoints = (error: number) =>
  Math.abs(error) <= NORTH_BULLSEYE ? 100 : Math.max(0, Math.round(100 - Math.abs(error) * 100 / NORTH_ZERO_AT))
