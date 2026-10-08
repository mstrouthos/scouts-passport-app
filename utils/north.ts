/* Πού είναι ο Βορράς; — once a day, five seconds to point the phone at north,
   scored by how far off it was. Shared by the page and the server. */

/** Seconds to turn, after a 3-2-1. */
export const NORTH_SECS = 5
/** Phones point to magnetic north; true north, in Cyprus, is about 5° west of
    it (the declination is about 5° east). The game scores against true north. */
export const NORTH_DECLINATION = 5
/** Full marks within this; it is a bullseye. */
export const NORTH_BULLSEYE = 3
/** At this far off, or more, nothing. */
export const NORTH_ZERO_AT = 60

/** Where the phone pointed (magnetic) against true north: −180…180, east (right) positive. */
export function northError(magneticHeading: number): number {
  let e = ((magneticHeading + NORTH_DECLINATION) % 360 + 360) % 360
  if (e > 180) e -= 360
  return Math.round(e * 10) / 10
}
/** 100 spot on, falling evenly to 0 at 60° off. */
export const northPoints = (error: number) =>
  Math.abs(error) <= NORTH_BULLSEYE ? 100 : Math.max(0, Math.round(100 - Math.abs(error) * 100 / NORTH_ZERO_AT))
