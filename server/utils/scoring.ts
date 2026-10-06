/** Timed scoring for challenge questions.

   The leader sets what a question is worth: the most (answered at once) and
   the least (however slowly) — 10 and 5 unless they change it. A scout reads
   it for free, and the clock only starts when they ask to see the options.
   From that moment one point drops every 5 seconds, down to the floor —
   taking your time costs you the bonus above the floor, never the reward for
   knowing the answer. */
export const MAX_POINTS = 10
export const MIN_POINTS = 5
export const POINTS_CAP = 100

/** A leader's max and min, made sensible: whole, 1–100, min never above max. */
export function pointRange(maxIn: unknown, minIn: unknown): { points: number, minPoints: number } {
  const n = (v: unknown, d: number) => {
    const x = Math.round(Number(v))
    return Number.isFinite(x) && x >= 0 ? Math.min(POINTS_CAP, x) : d
  }
  const points = Math.max(1, n(maxIn, MAX_POINTS))
  return { points, minPoints: Math.min(points, n(minIn, Math.min(MIN_POINTS, points))) }
}
export const DECAY_EVERY_MS = 5000
/** The few seconds to read a question before its options appear. They are
    counted by the server from the moment the question is opened, so closing
    it and opening it again does not buy a fresh read. */
export const READ_MS = 5000

/** Points a correct answer is worth `elapsedMs` after the options appeared. */
export function pointsAfter(elapsedMs: number, max = MAX_POINTS, min = MIN_POINTS): number {
  const decayed = max - Math.floor(Math.max(0, elapsedMs) / DECAY_EVERY_MS)
  return Math.max(Math.min(min, max), decayed)
}
