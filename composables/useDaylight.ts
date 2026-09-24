/* The camp as it looks right now, in Αμμόχωστος: the troop's own green by
   day (the crest's #3B6452 family, as the app has always been),
   golden at sunset, starlit at night, pink at sunrise — with the real times
   of sunrise and sunset for today's date, which in Cyprus swing by nearly two
   hours between June and December.

   The scene's colours are set as CSS variables and blend smoothly through
   dawn and dusk. `?time=HH:MM` in the address previews any moment
   (e.g. /login?time=19:40 for sunset) — handy for checking, harmless left in. */

type RGB = [number, number, number]
type Palette = {
  sky: [RGB, RGB, RGB, RGB]   // top → horizon
  warm: number                // warm glow on the horizon, 0–1
  hill: RGB; pf: RGB; pn: RGB; g1: RGB; g2: RGB
  stars: number; moon: number; sun: number; lamp: number; fire: number; clouds: number
  ink: RGB; title1: RGB; title2: RGB
  card: [RGB, number]; cardInk: RGB
}
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

const NIGHT: Palette = {
  sky: [hex('#07102A'), hex('#0E2146'), hex('#1C3D5E'), hex('#35596A')], warm: 0.28,
  hill: hex('#20413C'), pf: hex('#143029'), pn: hex('#0B1F1A'), g1: hex('#0E2519'), g2: hex('#081811'),
  stars: 1, moon: 1, sun: 0, lamp: 1, fire: 1, clouds: 0,
  ink: hex('#FFFFFF'), title1: hex('#FFF8E1'), title2: hex('#FFD97A'),
  card: [hex('#14243A'), 0.82], cardInk: hex('#FFFFFF')
}
const SUNRISE: Palette = {
  sky: [hex('#4A6FA5'), hex('#9DA8C8'), hex('#F2B7A0'), hex('#FFD9A0')], warm: 0.55,
  hill: hex('#6F8F72'), pf: hex('#4B6E54'), pn: hex('#2F5140'), g1: hex('#4B7A45'), g2: hex('#355E33'),
  stars: 0.15, moon: 0.2, sun: 1, lamp: 0.4, fire: 0.7, clouds: 0.6,
  ink: hex('#1D2A44'), title1: hex('#1F2A6B'), title2: hex('#3A4FA0'),
  card: [hex('#FFFFFF'), 0.8], cardInk: hex('#1D2A44')
}
const DAY: Palette = {
  sky: [hex('#4F8069'), hex('#5A8A72'), hex('#6F9B80'), hex('#93B79A')], warm: 0.08,
  hill: hex('#3F6E56'), pf: hex('#335F4A'), pn: hex('#27503C'), g1: hex('#2F5C43'), g2: hex('#223F2F'),
  stars: 0, moon: 0, sun: 1, lamp: 0, fire: 0.6, clouds: 0.4,
  ink: hex('#FFFFFF'), title1: hex('#FFF8E1'), title2: hex('#FFE27A'),
  card: [hex('#FFFFFF'), 0.14], cardInk: hex('#FFFFFF')
}
const SUNSET: Palette = {
  sky: [hex('#2E3F7A'), hex('#8A5C8E'), hex('#EE8A5A'), hex('#FFC36B')], warm: 0.7,
  hill: hex('#5D6E58'), pf: hex('#3C5143'), pn: hex('#233A30'), g1: hex('#3E6134'), g2: hex('#2B4A27'),
  stars: 0.1, moon: 0.3, sun: 1, lamp: 0.6, fire: 0.85, clouds: 0.55,
  ink: hex('#FFFFFF'), title1: hex('#FFF4DC'), title2: hex('#FFD27A'),
  card: [hex('#2A2440'), 0.78], cardInk: hex('#FFFFFF')
}

const mixN = (a: number, b: number, t: number) => a + (b - a) * t
const mixC = (a: RGB, b: RGB, t: number): RGB => [mixN(a[0], b[0], t), mixN(a[1], b[1], t), mixN(a[2], b[2], t)]
function mix(a: Palette, b: Palette, t: number): Palette {
  const o: any = {}
  for (const k of Object.keys(a) as (keyof Palette)[]) {
    const x: any = a[k], y: any = b[k]
    if (typeof x === 'number') o[k] = mixN(x, y, t)
    else if (k === 'sky') o[k] = x.map((c: RGB, i: number) => mixC(c, y[i], t))
    else if (k === 'card') o[k] = [mixC(x[0], y[0], t), mixN(x[1], y[1], t)]
    else o[k] = mixC(x, y, t)
  }
  return o
}
const css = (c: RGB, a = 1) => a >= 1 ? `rgb(${c.map(Math.round).join(',')})` : `rgba(${c.map(Math.round).join(',')},${a.toFixed(3)})`

/* Sunrise and sunset, in minutes after local midnight, for a date in
   Αμμόχωστος (35.12°N, 33.94°E) — the usual declination / hour-angle
   approximation, good to a few minutes, which is all a sky needs. */
function sunTimes(now: Date) {
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000)
  const decl = 23.44 * Math.sin((2 * Math.PI / 365) * (day - 81)) * Math.PI / 180
  const lat = 35.12 * Math.PI / 180
  const H = Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(decl)))) * 180 / Math.PI
  // equation of time, minutes
  const B = (2 * Math.PI / 364) * (day - 81)
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  const tz = -new Date(now).getTimezoneOffset()   // this device's offset, minutes
  const noon = 720 - 4 * 33.94 - eot + tz
  return { rise: noon - H * 4, set: noon + H * 4 }
}

/* The day's key moments and what the camp looks like at each. */
function paletteAt(min: number, rise: number, set: number): Palette {
  const keys: Array<[number, Palette]> = [
    [rise - 70, NIGHT], [rise, SUNRISE], [rise + 70, DAY],
    [set - 70, DAY], [set, SUNSET], [set + 60, NIGHT]
  ]
  if (min <= keys[0][0] || min >= keys[keys.length - 1][0]) return NIGHT
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i], [t1, p1] = keys[i + 1]
    if (min >= t0 && min <= t1) {
      const t = (min - t0) / (t1 - t0)
      return mix(p0, p1, t * t * (3 - 2 * t))   // smoothstep: slow at the ends
    }
  }
  return DAY
}

export function useDaylight(el: Ref<HTMLElement | null>) {
  const phase = ref<'night' | 'dawn' | 'day' | 'dusk'>('day')
  const route = useRoute()
  let timer: any = null

  function apply() {
    if (!el.value) return
    const now = new Date()
    const q = String(route.query.time || '')
    let min = now.getHours() * 60 + now.getMinutes()
    if (/^\d{1,2}:\d{2}$/.test(q)) { const [h, m] = q.split(':').map(Number); min = h * 60 + m }
    const { rise, set } = sunTimes(now)
    const p = paletteAt(min, rise, set)
    phase.value = min < rise - 70 || min > set + 60 ? 'night' : min < rise + 70 ? 'dawn' : min < set - 70 ? 'day' : 'dusk'

    // the sun's arc from sunrise to sunset; the moon's across the night
    const dayT = (min - rise) / (set - rise)
    const nightLen = 1440 - (set - rise)
    const nightT = (((min - set) % 1440) + 1440) % 1440 / nightLen
    // the arc tops out in the open sky below the title, never behind the crest
    const arc = (t: number) => ({ x: 8 + t * 84, y: 76 - Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 44 })
    const sun = arc(dayT), moon = arc(nightT)

    const s = el.value.style
    p.sky.forEach((c, i) => s.setProperty(`--sky${i + 1}`, css(c)))
    s.setProperty('--warm', p.warm.toFixed(3))
    s.setProperty('--hill', css(p.hill)); s.setProperty('--pf', css(p.pf)); s.setProperty('--pn', css(p.pn))
    s.setProperty('--g1', css(p.g1)); s.setProperty('--g2', css(p.g2))
    s.setProperty('--clouds', p.clouds.toFixed(3))
    s.setProperty('--stars', p.stars.toFixed(3)); s.setProperty('--lamp', p.lamp.toFixed(3)); s.setProperty('--fire', p.fire.toFixed(3))
    s.setProperty('--ink', css(p.ink)); s.setProperty('--title1', css(p.title1)); s.setProperty('--title2', css(p.title2))
    s.setProperty('--card', css(p.card[0], p.card[1])); s.setProperty('--card-ink', css(p.cardInk))
    s.setProperty('--sun-x', sun.x + '%'); s.setProperty('--sun-y', sun.y + '%')
    s.setProperty('--sun-o', (dayT > -0.05 && dayT < 1.05 ? p.sun : 0).toFixed(3))
    s.setProperty('--moon-x', moon.x + '%'); s.setProperty('--moon-y', moon.y + '%'); s.setProperty('--moon-o', p.moon.toFixed(3))
    // a low sun is large and orange; high, small and white-gold
    const height = Math.sin(Math.max(0, Math.min(1, dayT)) * Math.PI)
    s.setProperty('--sun-size', (78 - height * 26).toFixed(1) + 'px')
    s.setProperty('--sun-core', css(mixC(hex('#FF8A3D'), hex('#FFF6D5'), Math.min(1, height * 1.6))))
    el.value.dataset.phase = phase.value
  }
  onMounted(() => { apply(); timer = setInterval(apply, 60_000) })
  onBeforeUnmount(() => clearInterval(timer))
  watch(() => route.query.time, apply)
  return { phase }
}
