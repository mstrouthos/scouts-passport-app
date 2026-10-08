/* The Greek flag hanging limp from its pole, as a flag does with no wind:
   the hoist edge along the pole, the cloth falling to a point where the fly
   end hangs, the stripes running down its length and rippling together in
   its folds, the canton at the top by the pole. Drawn once, in a box about
   24 wide and 100 high, the top of the hoist at 0,0. */

const HOIST = 58, TIP: [number, number] = [21, 100]
const lerp = (a: number[], b: number[], k: number) => [a[0]! + (b[0]! - a[0]!) * k, a[1]! + (b[1]! - a[1]!) * k]
/** The line between stripe j and j+1 (0 the outer edge, 9 the foot of the
    hoist): from the pole down to the hem, which runs from the pole to the tip. */
function line(j: number) {
  const k = j / 9, S = [0, HOIST * k], E = lerp(TIP, [0, HOIST], k), M = lerp(S, E, .5), bow = 1 - k
  return [S, [M[0]! + 10 * bow, M[1]! - 10 * bow], E] as number[][]
}
/* a point along a line; every line sways the same way, more the further down,
   so the stripes ripple together in the folds */
function at(c: number[][], t: number) {
  const u = 1 - t
  const x = u * u * c[0]![0]! + 2 * u * t * c[1]![0]! + t * t * c[2]![0]!
  const y = u * u * c[0]![1]! + 2 * u * t * c[1]![1]! + t * t * c[2]![1]!
  return [x + Math.sin(y / 100 * Math.PI * 4.2) * 1.6 * Math.min(1, y / 30), y]
}
function band(j0: number, j1: number, t0: number, t1: number) {
  const a = line(j0), b = line(j1), N = 14, pts: number[][] = []
  for (let i = 0; i <= N; i++) pts.push(at(a, t0 + (t1 - t0) * i / N))
  for (let i = N; i >= 0; i--) pts.push(at(b, t0 + (t1 - t0) * i / N))
  return 'M' + pts.map(p => `${p[0]!.toFixed(2)} ${p[1]!.toFixed(2)}`).join(' L') + 'Z'
}

export const FLAG_BLUE = '#0D5EAF'
/** The pieces to fill, in order, and the outline to clip the folds' shading to. */
export function hangingFlag() {
  const parts: { d: string, fill: string }[] = []
  for (let j = 0; j < 9; j++) parts.push({ d: band(j, j + 1, 0, 1), fill: j % 2 ? '#fff' : FLAG_BLUE })
  // the canton: the first 10/27 of the top five stripes, blue, with its white cross
  const c = 10 / 27
  parts.push({ d: band(0, 5, 0, c), fill: FLAG_BLUE })
  parts.push({ d: band(2, 3, 0, c), fill: '#fff' })
  parts.push({ d: band(0, 5, 4 / 27, 6 / 27), fill: '#fff' })
  return { parts, outline: band(0, 9, 0, 1) }
}
