/** Timed scoring for challenge questions.

   Every question is worth the same: a scout reads it for free, and the clock
   only starts when they ask to see the options. From that moment one point
   drops every 5 seconds, down to a floor — taking your time costs you the
   bonus above the floor, never the reward for knowing the answer. */
export const MAX_POINTS = 10
export const MIN_POINTS = 5
export const DECAY_EVERY_MS = 5000

/** Points a correct answer is worth `elapsedMs` after the options appeared. */
export function pointsAfter(elapsedMs: number): number {
  const decayed = MAX_POINTS - Math.floor(Math.max(0, elapsedMs) / DECAY_EVERY_MS)
  return Math.max(MIN_POINTS, decayed)
}
