/* Little sounds, and a buzz, for the moments that deserve them: a right
   answer, a wrong one, something won, a medal, a place gained, a 👏, the
   flame catching, the camera's click. Made in the browser with the Web Audio
   API — short chimes and swooshes, no files to download — and quiet. Each can
   be turned off in the settings; a phone that cannot vibrate (iPhones) just
   plays the sound. */
export type Sfx = 'correct' | 'wrong' | 'unlock' | 'fanfare' | 'rankUp' | 'pop' | 'whoosh' | 'shutter'

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
  shutter: (c, o, t) => { noise(c, o, t, 0.05, 4000, 3000, 0.25, 0.7); noise(c, o, t + 0.08, 0.06, 2500, 1800, 0.2, 0.7) }
}
const BUZZ: Record<Sfx, number | number[]> = {
  correct: 30, wrong: [50, 40, 50], unlock: [20, 40, 20, 40, 70], fanfare: [40, 60, 40, 60, 90],
  rankUp: [30, 30, 60], pop: 12, whoosh: 25, shutter: 15
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
