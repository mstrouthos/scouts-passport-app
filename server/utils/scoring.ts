/** Timed scoring for challenge questions.

   A scout reads the question first; the clock only starts when they ask to see
   the options. From that moment one point drops every 5 seconds, but a correct
   answer is never worth less than MIN_POINTS — taking your time costs you the
   bonus above the floor, never the reward for knowing the answer. */
export const DECAY_EVERY_MS = 5000
export const MIN_POINTS = 5

/** Points a correct answer is worth `elapsedMs` after the options appeared. */
export function pointsAfter(full: number, elapsedMs: number): number {
  const floor = Math.min(MIN_POINTS, full)      // a 3-point question stays worth 3
  const decayed = full - Math.floor(Math.max(0, elapsedMs) / DECAY_EVERY_MS)
  return Math.max(floor, decayed)
}
