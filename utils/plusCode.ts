/* Google's plus codes (Open Location Code): "8G6FWJ99+FPV", or the short
   form Google Maps shows, "WJ99+FPV Παραλίμνι". The short form leaves out the
   code's first digits, which a nearby reference point supplies. */
const A = '23456789CFGHJMPQRVWX'
const PAIR = [20, 1, 0.05, 0.0025, 0.000125]
const ROWS = 5, COLS = 4

export const PLUS_CODE = /\b([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{0,7})(?=\s|,|$)/i

/** The centre of a full code's area. */
export function decodePlusCode(full: string): { lat: number, lng: number } | null {
  const code = full.toUpperCase().replace('+', '').replace(/0+$/, '')
  if (!code.length || [...code].some(c => !A.includes(c))) return null
  let south = -90, west = -180, h = 0, w = 0
  for (let i = 0; i < Math.min(code.length, 10); i += 2) {
    south += A.indexOf(code[i]) * PAIR[i / 2]
    if (code[i + 1] != null) west += A.indexOf(code[i + 1]) * PAIR[i / 2]
    h = w = PAIR[i / 2]
  }
  for (let i = 10; i < code.length; i++) {
    h /= ROWS; w /= COLS
    const d = A.indexOf(code[i])
    south += Math.floor(d / COLS) * h
    west += (d % COLS) * w
  }
  return { lat: south + h / 2, lng: west + w / 2 }
}

/** The first digits of the full code for a point — what a short code omits. */
function prefixFor(lat: number, lng: number, n: number): string {
  let la = Math.min(Math.max(lat, -90), 89.99999) + 90
  let lo = (((lng + 180) % 360) + 360) % 360
  let out = ''
  for (const r of PAIR) {
    if (out.length >= n) break
    const a = Math.floor(la / r), b = Math.floor(lo / r)
    out += A[a] + A[b]
    la -= a * r; lo -= b * r
  }
  return out.slice(0, n)
}

/** A short code, completed from the reference point nearest to where it is. */
export function recoverPlusCode(short: string, refLat: number, refLng: number): { lat: number, lng: number } | null {
  const code = short.toUpperCase()
  const sep = code.indexOf('+')
  if (sep >= 8) return decodePlusCode(code)
  const missing = 8 - sep
  const res = Math.pow(20, 2 - missing / 2)
  const p = decodePlusCode(prefixFor(refLat, refLng, missing) + code)
  if (!p) return null
  let { lat, lng } = p
  if (refLat + res / 2 < lat && lat - res >= -90) lat -= res
  else if (refLat - res / 2 > lat && lat + res <= 90) lat += res
  if (refLng + res / 2 < lng) lng -= res
  else if (refLng - res / 2 > lng) lng += res
  return { lat, lng }
}
