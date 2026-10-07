/* Little sounds, and a buzz, for the moments that deserve them: a right
   answer, a wrong one, something won, a medal, a place gained, a 👏, the
   flame catching, the camera's click. Made in the browser with the Web Audio
   API — short chimes and swooshes, no files to download — and quiet. Each can
   be turned off in the settings; a phone that cannot vibrate (iPhones) just
   plays the sound. */
export type Sfx = 'correct' | 'wrong' | 'unlock' | 'fanfare' | 'rankUp' | 'pop' | 'whoosh' | 'shutter' | 'splat' | 'bigSplat' | 'thud' | 'twinkle'

const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
export const sfxEnabled = () => import.meta.client && read('sfx') !== 'off'
export const hapticsEnabled = () => import.meta.client && read('haptics') !== 'off'

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (!import.meta.client) return null
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx!.state === 'suspended') ctx!.resume().catch(() => {})
  return ctx
}
/** Phones only let a page make sound after a touch: the first one wakes it. */
export function unlockAudio() { audio() }

/* one note: a tone that rises in a breath and fades */
function note(c: AudioContext, out: AudioNode, freq: number, at: number, len: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + len)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  o.connect(g).connect(out)
  o.start(at); o.stop(at + len + 0.02)
}
/* a breath of noise through a moving filter: a swoosh, a click */
function noise(c: AudioContext, out: AudioNode, at: number, len: number, from: number, to: number, vol = 0.12, q = 1.2) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  src.buffer = buf
  f.type = 'bandpass'; f.Q.value = q
  f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + len)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + len * 0.25)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  src.connect(f).connect(g).connect(out)
  src.start(at); src.stop(at + len)
}

/* a splat: the smack, a thump under it, a squelch rising after, then drips */
function splatAt(c: AudioContext, o: AudioNode, t: number, big: number, drips: number[]) {
  noise(c, o, t, 0.12 * big, 2600, 500, Math.min(0.6, 0.42 * big), 0.7)
  note(c, o, 170, t, 0.18 * big, 'sine', Math.min(0.4, 0.28 * big), 48)
  noise(c, o, t + 0.05, 0.26 * big, 320, 1500, 0.16 * big, 5)
  noise(c, o, t + 0.1, 0.2 * big, 900, 260, 0.08 * big, 3)
  drips.forEach((d, i) => note(c, o, 950 + i * 140, t + d, 0.08, 'sine', 0.06, 1700 + i * 200))
}

const SOUNDS: Record<Sfx, (c: AudioContext, o: AudioNode, t: number) => void> = {
  // two bright notes, up
  correct: (c, o, t) => { note(c, o, 1046.5, t, 0.16, 'triangle'); note(c, o, 1568, t + 0.09, 0.32, 'triangle') },
  // a soft "bwomp", down
  wrong: (c, o, t) => { note(c, o, 330, t, 0.32, 'triangle', 0.16, 190) },
  // a sparkle running up, and a shimmer
  unlock: (c, o, t) => {
    ;[1046.5, 1318.5, 1568, 2093].forEach((f, i) => note(c, o, f, t + i * 0.07, 0.3, 'sine', 0.14))
    note(c, o, 2637, t + 0.3, 0.6, 'sine', 0.06)
  },
  // a little brass call: up the chord, the last note held
  fanfare: (c, o, t) => {
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(o)
    ;[[523.25, 0, 0.14], [659.25, 0.13, 0.14], [783.99, 0.26, 0.14], [1046.5, 0.4, 0.6]].forEach(([f, d, l]) => {
      note(c, lp, f, t + d, l, 'sawtooth', 0.07); note(c, lp, f * 2, t + d, l, 'triangle', 0.05)
    })
  },
  // a rush up, then a chime on top
  rankUp: (c, o, t) => { note(c, o, 392, t, 0.35, 'triangle', 0.12, 1175); note(c, o, 1568, t + 0.33, 0.4, 'sine', 0.14); note(c, o, 2093, t + 0.42, 0.45, 'sine', 0.08) },
  // a clap: a snap of noise and a tiny pop
  pop: (c, o, t) => { noise(c, o, t, 0.09, 1800, 1200, 0.22, 0.8); note(c, o, 700, t, 0.08, 'sine', 0.08, 1100) },
  // the flame catching
  whoosh: (c, o, t) => { noise(c, o, t, 0.55, 300, 2600, 0.14, 0.9); note(c, o, 220, t + 0.1, 0.4, 'sine', 0.05, 440) },
  // the camera
  shutter: (c, o, t) => { noise(c, o, t, 0.05, 4000, 3000, 0.25, 0.7); noise(c, o, t + 0.08, 0.06, 2500, 1800, 0.2, 0.7) },
  // something soft landing hard: a wet burst, and a drop
  splat: (c, o, t) => splatAt(c, o, t, 1, [0.32]),
  // the same, at you: bigger, wetter, and it drips
  bigSplat: (c, o, t) => splatAt(c, o, t, 1.5, [0.42, 0.7, 1.05]),
  // a bump: low, short
  thud: (c, o, t) => { note(c, o, 150, t, 0.16, 'sine', 0.22, 55); noise(c, o, t, 0.07, 500, 200, 0.12, 0.8) },
  // something kind: a little run of bells
  twinkle: (c, o, t) => { [1318.5, 1568, 2093].forEach((f, i) => note(c, o, f, t + i * 0.07, 0.3, 'sine', 0.1)) }
}
const BUZZ: Record<Sfx, number | number[]> = {
  correct: 30, wrong: [50, 40, 50], unlock: [20, 40, 20, 40, 70], fanfare: [40, 60, 40, 60, 90],
  rankUp: [30, 30, 60], pop: 12, whoosh: 25, shutter: 15,
  splat: [35, 30, 20], bigSplat: [70, 40, 40, 30, 25], thud: [45], twinkle: 15
}

/** Play a sound, and buzz the phone, as the member has them set. */
export function sfx(name: Sfx) {
  if (!import.meta.client) return
  try {
    if (sfxEnabled()) {
      const c = audio()
      if (c) {
        const out = c.createGain(); out.gain.value = 0.9; out.connect(c.destination)
        SOUNDS[name](c, out, c.currentTime + 0.01)
      }
    }
    if (hapticsEnabled() && 'vibrate' in navigator) navigator.vibrate(BUZZ[name])
  } catch { /* a sound is never worth an error */ }
}

/* ---- the playground's own: one sound for each thing a Βαθμοφόρος can do
   to another, played when it lands. `big` is when it lands on you. ---- */
type Play = (c: AudioContext, o: AudioNode, t: number, big: number) => void
/* a buzzing wing: a thin saw that wavers */
function buzzing(c: AudioContext, o: AudioNode, at: number, len: number, freq: number, vol: number) {
  const osc = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), g = c.createGain()
  osc.type = 'sawtooth'; osc.frequency.value = freq
  lfo.frequency.value = 24; depth.gain.value = freq * 0.06
  lfo.connect(depth).connect(osc.frequency)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.08)
  g.gain.setValueAtTime(vol, at + len * 0.4)
  g.gain.exponentialRampToValueAtTime(vol * 2, at + len * 0.75)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  osc.connect(g).connect(o)
  osc.start(at); lfo.start(at); osc.stop(at + len + 0.02); lfo.stop(at + len + 0.02)
}
const chord = (c: AudioContext, o: AudioNode, at: number, fs: number[], len: number, vol: number, type: OscillatorType = 'sine') =>
  fs.forEach(f => note(c, o, f, at, len, type, vol))
const FUN_SOUNDS: Record<string, Play> = {
  tomato: (c, o, t, b) => splatAt(c, o, t, b, b > 1 ? [0.42, 0.7, 1.05] : [0.32]),
  // a soft, creamy splotch
  pie: (c, o, t, b) => {
    noise(c, o, t, 0.14 * b, 1800, 380, 0.4 * b, 0.6); note(c, o, 140, t, 0.2, 'sine', 0.28, 55)
    noise(c, o, t + 0.06, 0.3 * b, 240, 800, 0.14 * b, 4)
  },
  // a splash, and the bubbles after it
  water: (c, o, t, b) => {
    noise(c, o, t, 0.4 * b, 3200, 700, 0.42 * b, 0.45)
    for (let i = 0; i < 6 * b; i++) note(c, o, 600 + Math.random() * 900, t + 0.12 + i * 0.05, 0.06, 'sine', 0.06, 1200 + Math.random() * 900)
  },
  // a crunchy puff
  snowball: (c, o, t, b) => {
    noise(c, o, t, 0.06, 5000, 3000, 0.35 * b, 0.8); noise(c, o, t + 0.03, 0.25 * b, 2600, 900, 0.22 * b, 0.6)
    note(c, o, 220, t, 0.1, 'sine', 0.12, 90)
  },
  // a soft poof, and a gooey stretch
  marshmallow: (c, o, t, b) => {
    noise(c, o, t, 0.2, 900, 280, 0.25 * b, 0.6); note(c, o, 300, t, 0.15, 'sine', 0.14, 160)
    note(c, o, 190, t + 0.12, 0.3 * b, 'triangle', 0.06, 430)
  },
  // a deep wet squelch
  mud: (c, o, t, b) => {
    noise(c, o, t, 0.28 * b, 700, 120, 0.45 * b, 0.6); note(c, o, 110, t, 0.25, 'sine', 0.32, 40)
    noise(c, o, t + 0.08, 0.32 * b, 180, 650, 0.16 * b, 6)
  },
  // a wooden bonk
  pinecone: (c, o, t, b) => {
    note(c, o, 540, t, 0.12, 'triangle', 0.26 * b, 380); note(c, o, 810, t, 0.06, 'sine', 0.1); noise(c, o, t, 0.03, 3000, 2000, 0.2, 1)
  },
  // a shove: air, then a bump
  push: (c, o, t, b) => { noise(c, o, t, 0.18, 400, 1600, 0.12, 0.9); note(c, o, 150, t + 0.12, 0.16, 'sine', 0.28 * b, 55) },
  // boop
  poke: (c, o, t, b) => { note(c, o, 620, t, 0.09, 'sine', 0.2 * b, 930); note(c, o, 930, t + 0.07, 0.05, 'sine', 0.08) },
  // a wet slap
  fish: (c, o, t, b) => {
    noise(c, o, t, 0.07, 3200, 1200, 0.5 * b, 0.5); noise(c, o, t + 0.03, 0.16, 800, 300, 0.2, 2)
    note(c, o, 320, t, 0.14, 'sine', 0.14, 140); note(c, o, 280, t + 0.22, 0.12, 'sine', 0.06, 200)
  },
  // a rope pulled tight
  knot: (c, o, t, b) => {
    noise(c, o, t, 0.16, 700, 3800, 0.12 * b, 3); note(c, o, 130, t + 0.12, 0.28, 'sawtooth', 0.03 * b, 95)
    noise(c, o, t + 0.36, 0.05, 2400, 1800, 0.18, 1)
  },
  // bzzz… closer… BZZ
  mosquito: (c, o, t, b) => buzzing(c, o, t, 1.1 * b, 640, 0.03 * b),
  // the bugle: the first notes of the reveille
  wakeup: (c, o, t, b) => {
    const G4 = 392, C5 = 523.25, E5 = 659.25, G5 = 783.99
    ;[[G4, 0, 0.12], [C5, 0.14, 0.12], [E5, 0.28, 0.12], [C5, 0.42, 0.12], [E5, 0.56, 0.12], [G5, 0.7, 0.34]]
      .forEach(([f, d, l]) => { note(c, o, f, t + d, l, 'square', 0.035 * b); note(c, o, f, t + d, l, 'triangle', 0.08 * b) })
  },
  // pots and plates
  dishes: (c, o, t, b) => {
    for (let i = 0; i < 4; i++) {
      const d = i * 0.07 + Math.random() * 0.03
      noise(c, o, t + d, 0.05, 6000, 4000, 0.15 * b, 8); note(c, o, 1800 + Math.random() * 1600, t + d, 0.18, 'sine', 0.05)
    }
  },
  // a clap
  highfive: (c, o, t, b) => { noise(c, o, t, 0.07, 2600, 1400, 0.6 * b, 0.7); noise(c, o, t + 0.02, 0.05, 1800, 1200, 0.3, 0.8); chord(c, o, t + 0.08, [1046.5, 1318.5], 0.25, 0.05) },
  // a warm "aww"
  hug: (c, o, t, b) => { chord(c, o, t, [261.6, 329.6, 392], 0.7 * b, 0.07); note(c, o, 523.25, t + 0.12, 0.6, 'sine', 0.05) },
  // poured, then "aah"
  coffee: (c, o, t, b) => { noise(c, o, t, 0.45, 1300, 900, 0.1 * b, 4); note(c, o, 392, t + 0.5, 0.35, 'triangle', 0.08, 330) },
  // a little fanfare
  salute: (c, o, t, b) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(c, o, f, t + i * 0.09, i === 3 ? 0.4 : 0.12, 'triangle', 0.12 * b)),
  // a firm handshake: two soft pats and a chime
  handshake: (c, o, t, b) => { noise(c, o, t, 0.05, 1400, 900, 0.3, 0.7); noise(c, o, t + 0.13, 0.05, 1400, 900, 0.25, 0.7); chord(c, o, t + 0.25, [784, 1175], 0.35, 0.06 * b) },
  // the wrapper, then something sweet
  chocolate: (c, o, t, b) => {
    for (let i = 0; i < 7; i++) noise(c, o, t + i * 0.035, 0.03, 5000, 3500, 0.1, 2)
    chord(c, o, t + 0.3, [1318.5, 1568], 0.35, 0.06 * b)
  },
  // a party popper, and the sparkles coming down
  confetti: (c, o, t, b) => {
    noise(c, o, t, 0.08, 2000, 900, 0.5 * b, 0.7); note(c, o, 300, t, 0.08, 'sine', 0.2, 900)
    for (let i = 0; i < 8; i++) note(c, o, 1400 + Math.random() * 1600, t + 0.12 + i * 0.06, 0.12, 'sine', 0.05)
  }
}
const FUN_BUZZ: Record<string, number[]> = {
  throw: [35, 30, 20], shove: [45], kind: [15, 40, 15]
}

/** The sound of one of the playground's things landing — on someone else, or
    (`atMe`) on you, bigger. */
export function funSound(key: string, motion: string, atMe = false) {
  if (!import.meta.client) return
  try {
    if (sfxEnabled()) {
      const c = audio()
      const play = FUN_SOUNDS[key]
      if (c && play) {
        const out = c.createGain(); out.gain.value = 0.9; out.connect(c.destination)
        play(c, out, c.currentTime + 0.01, atMe ? 1.5 : 1)
      }
    }
    if (hapticsEnabled() && 'vibrate' in navigator) navigator.vibrate(atMe ? [70, 40, 40, 30, 25] : (FUN_BUZZ[motion] || 20))
  } catch { /* a sound is never worth an error */ }
}

/** The settings' two switches. */
export function useSfxPrefs() {
  const sound = ref(true), haptics = ref(true)
  let ready = false
  onMounted(() => { sound.value = sfxEnabled(); haptics.value = hapticsEnabled(); nextTick(() => { ready = true }) })
  const save = (k: string, on: boolean) => { try { localStorage.setItem(k, on ? 'on' : 'off') } catch {} }
  // switching one on plays a sample of it
  watch(sound, v => { if (!ready) return; save('sfx', v); if (v) sfx('correct') })
  watch(haptics, v => { if (!ready) return; save('haptics', v); if (v) sfx('pop') })
  return { sound, haptics }
}
