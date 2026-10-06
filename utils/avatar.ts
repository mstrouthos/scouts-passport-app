/* A member's avatar, built from choices and drawn as a flat, chunky cartoon
   SVG — rounded-square heads, big white eyes, solid colours with a second,
   deeper flat tone for shade, no outlines. Everyone wears the troop's
   neckerchief in its blue and yellow stripes, through the brown leather
   woggle, exactly as the phoenix does (components/MascotPhoenix.vue).

   The same function draws the avatar everywhere, and the builder's tiles,
   zoomed in on what each choice changes. */

export const AVATAR_OPTIONS = {
  gender: ['boy', 'girl'],
  skin: ['#FFE0CC', '#F9CBA7', '#EDB485', '#D99A68', '#B9774A', '#935A35', '#6E3F22', '#4A2A17'],
  head: ['square', 'round', 'tall', 'wide'],
  clothes: ['uniform', 'tee', 'hoodie', 'sweater'],
  clothesColor: ['#C9B48A', '#2E5E8C', '#3B6452', '#B23A48', '#5B4A8B', '#E08A2E', '#2B2B33', '#E9EEF4'],
  hair: ['none', 'buzz', 'crew', 'receding', 'short', 'side', 'wavyShort', 'curly', 'afroShort', 'afro', 'locs', 'cornrows', 'bob', 'long', 'wavy', 'curlyLong', 'ponytail', 'pigtails', 'bun', 'braids'],
  hairColor: ['#2A1E1A', '#4A3125', '#7B4A2A', '#B6763A', '#E3BC62', '#B5482A', '#9AA0A6', '#8E5BD6', '#3B82D6', '#E35D9A'],
  eyeColor: ['#2A2330', '#6B3E1F', '#8A6B2E', '#3E8A3A', '#2F79B8', '#1D8A8A'],
  eyeShape: ['round', 'almond', 'small'],
  brows: ['normal', 'thin', 'thick'],
  nose: ['button', 'round', 'long', 'wide'],
  facialHairColor: ['#2A1E1A', '#4A3125', '#7B4A2A', '#B6763A', '#E3BC62', '#B5482A', '#9AA0A6', '#8E5BD6', '#3B82D6', '#E35D9A'],
  expression: ['smile', 'grin', 'laugh', 'cool', 'surprised', 'silly', 'calm', 'determined'],
  extras: ['none', 'freckles', 'blush', 'plaster'],
  earrings: ['none', 'studs', 'hoops'],
  gear: ['none', 'whistle', 'compass', 'badges'],
  facialHair: ['none', 'stubble', 'shortBeard', 'denseShort', 'beard', 'moustache', 'goatee', 'chinPatch'],
  glasses: ['none', 'round', 'square', 'cateye', 'sunglasses'],
  glassesColor: ['#2A2330', '#B23A48', '#2F79B8', '#3E8A3A', '#C99A18', '#E35D9A'],
  headwear: ['none', 'scout', 'beret', 'cap', 'beanie', 'golden'],
  /* limited edition: earned by keeping the quiz streak, never chosen freely
     (see STREAK_REWARDS) — a pin, the woggle, a scene, a companion, an aura */
  pin: ['none', 'flame'],
  woggle: ['classic', 'silver', 'gold'],
  scene: ['none', 'campfire', 'aurora', 'sunrise'],
  patch: ['none', 'bronze', 'silver'],
  cord: ['none', 'honour'],
  companion: ['none', 'phoenix'],
  aura: ['none', 'legend'],
  headwearColor: ['#7A1F2B', '#2E5E8C', '#3B6452', '#2B2B33', '#E08A2E', '#E35D9A', '#E9EEF4'],
  bg: ['#D9E8FD', '#CDEFE0', '#FCEFC7', '#FBDCE2', '#E6DDF7', '#FFE1C7', '#D4F1F7', '#E3E7EE']
} as const

/* What each gender is offered: a boy picks among short styles, a girl among
   long and tied ones as well as the short ones many girls wear; beards and
   moustaches to men. */
export const FOR_GENDER: Record<string, Partial<Record<string, readonly string[]>>> = {
  boy: {
    hair: ['none', 'buzz', 'crew', 'receding', 'short', 'side', 'wavyShort', 'curly', 'afroShort', 'afro', 'locs', 'cornrows']
  },
  girl: {
    hair: ['long', 'wavy', 'curlyLong', 'ponytail', 'pigtails', 'bun', 'braids', 'bob', 'short', 'side', 'curly', 'afroShort', 'afro', 'locs', 'cornrows'],
    facialHair: ['none']
  }
}
/** The choices offered for this field to this gender. */
export function optionsFor(field: string, gender: string): readonly string[] {
  // the limited-edition ones live in the collection, not among the choices
  const list: readonly string[] = FOR_GENDER[gender]?.[field] ?? (AVATAR_OPTIONS as any)[field]
  return list.filter(v => !STREAK_REWARDS.some(r => r.field === field && r.value === v))
}

/* Limited edition: earned by a streak — days in a row answering the quiz,
   from 7 to 300, or meetings in a row present, from 5 to 40 — each more
   impressive than the last. Nobody can choose one any other way; once
   earned it is theirs for good, even if the streak later ends. */
export const STREAK_REWARDS = [
  { track: 'quiz', days: 7, key: 'flamePin', field: 'pin', value: 'flame', crop: 'body' },
  { track: 'quiz', days: 20, key: 'silverWoggle', field: 'woggle', value: 'silver', crop: 'body' },
  { track: 'quiz', days: 40, key: 'campfire', field: 'scene', value: 'campfire', crop: 'full' },
  { track: 'quiz', days: 60, key: 'goldWoggle', field: 'woggle', value: 'gold', crop: 'body' },
  { track: 'quiz', days: 90, key: 'goldenHat', field: 'headwear', value: 'golden', crop: 'head' },
  { track: 'quiz', days: 150, key: 'phoenix', field: 'companion', value: 'phoenix', crop: 'full' },
  { track: 'quiz', days: 200, key: 'aurora', field: 'scene', value: 'aurora', crop: 'full' },
  { track: 'quiz', days: 300, key: 'legend', field: 'aura', value: 'legend', crop: 'full' },
  { track: 'attendance', days: 5, key: 'bronzePatch', field: 'patch', value: 'bronze', crop: 'body' },
  { track: 'attendance', days: 10, key: 'silverPatch', field: 'patch', value: 'silver', crop: 'body' },
  { track: 'attendance', days: 20, key: 'honourCord', field: 'cord', value: 'honour', crop: 'body' },
  { track: 'attendance', days: 40, key: 'sunrise', field: 'scene', value: 'sunrise', crop: 'full' }
] as const
export type StreakReward = typeof STREAK_REWARDS[number]

/** The avatar with anything limited-edition its owner has not earned taken
    off again. */
export function withoutLocked(a: Avatar, unlocked: readonly string[]): Avatar {
  const out: any = { ...a }
  for (const r of STREAK_REWARDS)
    if (out[r.field] === r.value && !unlocked.includes(r.key)) out[r.field] = (DEFAULT_AVATAR as any)[r.field]
  return out
}

type O = typeof AVATAR_OPTIONS
export type Avatar = { [K in keyof O]: O[K][number] }
type K = keyof O

export const DEFAULT_AVATAR: Avatar = {
  gender: 'boy', skin: '#F9CBA7', head: 'square', clothes: 'uniform', clothesColor: '#C9B48A',
  hair: 'short', hairColor: '#4A3125', eyeColor: '#2A2330', expression: 'smile', extras: 'none',
  eyeShape: 'round', brows: 'normal', nose: 'button', facialHairColor: '#4A3125',
  facialHair: 'none', glasses: 'none', glassesColor: '#2A2330', headwear: 'none', headwearColor: '#7A1F2B', bg: '#D9E8FD',
  earrings: 'none', gear: 'none',
  pin: 'none', woggle: 'classic', scene: 'none', companion: 'none', aura: 'none', patch: 'none', cord: 'none'
}

/* avatars saved before the redraw named a few things differently */
const OLD: Record<string, (v: any, out: any) => void> = {
  face: (v, o) => { o.head = v === 'oval' ? 'tall' : v === 'round' ? 'round' : 'square' },
  shirt: (v, o) => { if ((AVATAR_OPTIONS.clothesColor as readonly string[]).includes(v)) o.clothesColor = v },
  hat: (v, o) => { if ((AVATAR_OPTIONS.headwear as readonly string[]).includes(v)) o.headwear = v },
  facewear: (v, o) => {
    if (['round', 'square', 'sunglasses'].includes(v)) o.glasses = v
    else if (['freckles', 'blush'].includes(v)) o.extras = v
  },
  mouth: (v, o) => { o.expression = v === 'grin' ? 'grin' : v === 'open' ? 'surprised' : v === 'calm' ? 'calm' : 'smile' }
}

/** Only known choices survive; anything else falls back to the default. */
export function normalizeAvatar(raw: any): Avatar {
  const out: any = { ...DEFAULT_AVATAR }
  for (const [k, f] of Object.entries(OLD)) if (raw?.[k] != null) f(raw[k], out)
  for (const k of Object.keys(AVATAR_OPTIONS) as K[]) {
    const v = raw?.[k]
    if ((AVATAR_OPTIONS[k] as readonly string[]).includes(v)) out[k] = v
  }
  // a beard without a colour of its own takes the hair's
  if (!(AVATAR_OPTIONS.facialHairColor as readonly string[]).includes(raw?.facialHairColor)) out.facialHairColor = out.hairColor
  return out
}

export function randomAvatar(): Avatar {
  const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
  const gender = pick(AVATAR_OPTIONS.gender)
  const hair = pick(optionsFor('hair', gender).filter(h => h !== 'none'))
  return normalizeAvatar({
    gender, hair,
    skin: pick(AVATAR_OPTIONS.skin), head: pick(AVATAR_OPTIONS.head),
    clothes: pick(AVATAR_OPTIONS.clothes), clothesColor: pick(AVATAR_OPTIONS.clothesColor),
    hairColor: pick(AVATAR_OPTIONS.hairColor.slice(0, 7)), eyeColor: pick(AVATAR_OPTIONS.eyeColor),
    expression: pick(AVATAR_OPTIONS.expression),
    extras: Math.random() < 0.35 ? pick(AVATAR_OPTIONS.extras.slice(1)) : 'none',
    earrings: gender === 'girl' && Math.random() < 0.4 ? pick(AVATAR_OPTIONS.earrings.slice(1)) : 'none',
    gear: Math.random() < 0.3 ? pick(AVATAR_OPTIONS.gear.slice(1)) : 'none',
    glasses: Math.random() < 0.3 ? pick(AVATAR_OPTIONS.glasses.slice(1)) : 'none',
    glassesColor: pick(AVATAR_OPTIONS.glassesColor),
    headwear: Math.random() < 0.35 ? pick(optionsFor('headwear', gender).filter(h => h !== 'none')) : 'none',
    headwearColor: pick(AVATAR_OPTIONS.headwearColor), bg: pick(AVATAR_OPTIONS.bg)
  })
}

/* a colour a little darker (k < 1) or lighter (k > 1), for the flat shade */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))))
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c).map(v => v.toString(16).padStart(2, '0')).join('')
}

const INK = '#2A2330'
/* the troop's neckerchief, as on the phoenix */
const SCARF_BLUE = '#2A56A8', SCARF_YELLOW = '#FFD84A', SCARF_SHADE = '#1C3F80'
const WOGGLE = '#8B5A2E', WOGGLE_D = '#6E4524'
/* the troop's crest, as a badge for hats: the yellow disc of the logo with
   its navy ring and a navy fleur-de-lis, drawn flat so it still reads small */
const CREST_YELLOW = '#F2C230', CREST_NAVY = '#1F2C6B'
function crest(x: number, y: number, r = 8) {
  const k = r / 8
  return `<g transform="translate(${x} ${y}) scale(${k})">`
    + `<circle r="8" fill="${CREST_YELLOW}" stroke="${CREST_NAVY}" stroke-width="1.8"/>`
    + `<path d="M0 -5.6C1.9 -3.3 2.3 -1.3 0 1.2C-2.3 -1.3 -1.9 -3.3 0 -5.6Z M-0.9 0.8C-3.6 -2.1 -5.6 0.2 -3.9 2.3C-3 1.3 -1.9 1.7 -0.9 2.1Z M0.9 0.8C3.6 -2.1 5.6 0.2 3.9 2.3C3 1.3 1.9 1.7 0.9 2.1Z M-3.2 1.9H3.2V3.3H-3.2Z M-0.9 3.3H0.9L0.5 5.6H-0.5Z" fill="${CREST_NAVY}"/>`
    + `</g>`
}

/** The part a builder tile shows: the whole avatar, the face, the head with
    what is on it, or the body. */
export type Crop = 'full' | 'face' | 'head' | 'body'
const VIEW: Record<Crop, string> = {
  // the whole avatar, framed so the face fills it and the woggle still shows
  full: '10 4 180 180', face: '46 26 108 108', head: '22 -4 156 156', body: '20 100 160 100'
}

/** The SVG, as markup. `id` keeps its patterns apart from another avatar's
    on the same page. */
export function avatarSvg(a0: Partial<Avatar> | null | undefined, id = 'a', crop: Crop = 'full'): string {
  const a = normalizeAvatar(a0 || {})
  const skin = a.skin, skinD = shade(skin, 0.86), skinDD = shade(skin, 0.72)
  const hairC = a.hairColor, hairD = shade(hairC, 0.78)
  const cx = 100

  /* the head: a rounded square, of four proportions */
  const HB: Record<string, { w: number, h: number, r: number }> = {
    square: { w: 84, h: 82, r: 24 }, round: { w: 86, h: 86, r: 40 }, tall: { w: 76, h: 94, r: 30 }, wide: { w: 98, h: 78, r: 28 }
  }
  const hb = HB[a.head]
  const x0 = cx - hb.w / 2, y0 = 124 - hb.h, w = hb.w, h = hb.h, x1 = x0 + w, y1 = y0 + h
  const ey = y0 + h * 0.5, ex = w * 0.2, eyeL = cx - ex, eyeR = cx + ex

  /* ---- body, clothes, neck ---- */
  const cc = a.clothesColor, ccD = shade(cc, 0.82), ccL = shade(cc, 1.25)
  const torso = `<path d="M34 200 L44 162 Q50 144 72 140 L128 140 Q150 144 156 162 L166 200 Z" fill="${cc}"/>`
    + `<path d="M34 200 L44 162 Q47 154 54 149 L60 200 Z M166 200 L156 162 Q153 154 146 149 L140 200 Z" fill="${ccD}"/>`
  const clothes: Record<string, string> = {
    // the scout shirt: collar points, two button-down pockets, epaulettes
    uniform: torso
      + `<path d="M74 140 L92 154 L84 163 L68 143 Z M126 140 L108 154 L116 163 L132 143 Z" fill="${ccD}"/>`
      + `<rect x="56" y="168" width="22" height="22" rx="4" fill="${ccD}"/><rect x="122" y="168" width="22" height="22" rx="4" fill="${ccD}"/>`
      + `<rect x="56" y="168" width="22" height="8" rx="3" fill="${shade(cc, 0.7)}"/><rect x="122" y="168" width="22" height="8" rx="3" fill="${shade(cc, 0.7)}"/>`
      + `<rect x="47" y="149" width="22" height="7" rx="3.5" fill="${ccD}" transform="rotate(-20 58 152)"/><rect x="131" y="149" width="22" height="7" rx="3.5" fill="${ccD}" transform="rotate(20 142 152)"/>`,
    tee: torso + `<path d="M82 141 Q100 156 118 141" fill="none" stroke="${ccD}" stroke-width="6" stroke-linecap="round"/>`,
    hoodie: `<path d="M60 152 Q58 128 100 126 Q142 128 140 152 Q120 142 100 142 Q80 142 60 152 Z" fill="${ccD}"/>` + torso
      + `<path d="M91 152 L89 180 M109 152 L111 180" stroke="${ccL}" stroke-width="3.4" stroke-linecap="round"/><circle cx="89" cy="182" r="3" fill="${ccL}"/><circle cx="111" cy="182" r="3" fill="${ccL}"/>`
      + `<rect x="72" y="186" width="56" height="20" rx="7" fill="${ccD}"/>`,
    sweater: torso + `<path d="M80 141 Q100 160 120 141" fill="none" stroke="${ccD}" stroke-width="9" stroke-linecap="round"/>`
      + [0, 1, 2, 3, 4].map(i => `<path d="M${50 + i * 24} 188 l7 8 l7 -8" fill="none" stroke="${ccL}" stroke-width="3.4" stroke-linejoin="round"/>`).join('')
  }
  const neck = `<rect x="${cx - 15}" y="${y1 - 14}" width="30" height="${154 - y1 + 14}" rx="8" fill="${skinD}"/>`

  /* the woggle: brown leather; silver with the crest (20 days); gold with a
     red stone (60 days) */
  const WOGGLES: Record<string, string> = {
    classic: `<rect x="90.5" y="159" width="19" height="13" rx="5.5" fill="${WOGGLE}"/><rect x="90.5" y="165.5" width="19" height="6.5" rx="3.2" fill="${WOGGLE_D}"/>`,
    silver: `<rect x="89.5" y="158.5" width="21" height="14" rx="6" fill="#C9D3DE"/><rect x="89.5" y="165.5" width="21" height="7" rx="3.5" fill="#9AA8B8"/>`
      + `<rect x="92" y="160" width="9" height="2.6" rx="1.3" fill="#fff" opacity=".85"/>` + crest(100, 165.5, 4.2),
    gold: `<rect x="89" y="158" width="22" height="15" rx="6.5" fill="${'#F2C230'}"/><rect x="89" y="165.5" width="22" height="7.5" rx="3.7" fill="#C99A18"/>`
      + `<rect x="91.5" y="159.6" width="10" height="2.8" rx="1.4" fill="#FFF3B8"/>`
      + `<circle cx="100" cy="165.5" r="3.6" fill="#D8343C" stroke="#8E1A22" stroke-width="1"/><circle cx="99" cy="164.4" r="1.1" fill="#fff"/>`
      + `<path d="M115 156 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 Z" fill="#FFF3B8"/>`
  }

  /* the neckerchief: one rolled cloth, round the back of the neck and forward
     on both sides, its two ends brought together through the woggle under
     the chin, their tips just showing below the ring. Blue and yellow
     stripes with a blue edge, as the phoenix wears it. The part behind the
     neck is drawn before the neck, the rest after, so the neck goes through. */
  const SC = `fill="url(#st-${id})" stroke="${SCARF_BLUE}" stroke-width="2.4" stroke-linejoin="round"`
  const scarfBack = `<path d="M77 144 Q76 131 100 130 Q124 131 123 144 L114 142 Q112 138 100 138 Q88 138 86 142 Z" ${SC}/>`
  const scarfFront = `<path d="M77 144 Q84 158 96 166 L104 166 Q116 158 123 144 L114 142 Q109 155 100 158 Q91 155 86 142 Z" ${SC}/>`
    + `<path d="M84 148 Q92 157 100 159 Q108 157 116 148" fill="none" stroke="${SCARF_SHADE}" stroke-width="2" opacity=".35"/>`
    + `<path d="M95.5 170 L88 189 L99.5 179 Z M104.5 170 L112 189 L100.5 179 Z" ${SC}/>`
    + WOGGLES[a.woggle]

  /* ---- hair: what falls behind the head, and what sits on it ---- */
  const back: Record<string, string> = {
    long: `<path d="M${x0 - 10} ${y0 + 26} Q${x0 - 14} ${y1 + 26} ${x0 - 4} ${y1 + 36} L${x1 + 4} ${y1 + 36} Q${x1 + 14} ${y1 + 26} ${x1 + 10} ${y0 + 26} Z" fill="${hairD}"/>`,
    wavy: `<path d="M${x0 - 10} ${y0 + 26} Q${x0 - 16} ${y1 + 16} ${x0 - 8} ${y1 + 30} q8 9 15 0 q8 9 15 0 L${x1 - 8} ${y1 + 30} q8 9 15 0 Q${x1 + 16} ${y1 + 16} ${x1 + 10} ${y0 + 26} Z" fill="${hairD}"/>`,
    bob: `<path d="M${x0 - 9} ${y0 + 20} Q${x0 - 12} ${y1 - 4} ${x0 - 6} ${y1 + 2} L${x1 + 6} ${y1 + 2} Q${x1 + 12} ${y1 - 4} ${x1 + 9} ${y0 + 20} Z" fill="${hairD}"/>`,
    afro: `<rect x="${x0 - 22}" y="${y0 - 24}" width="${w + 44}" height="${h * 0.86 + 24}" rx="${(w + 44) / 2.3}" fill="${hairC}"/>`,
    ponytail: `<path d="M${x1 - 6} ${y0 + 16} Q${x1 + 34} ${y0 + 10} ${x1 + 26} ${y0 + 60} Q${x1 + 22} ${y0 + 80} ${x1 + 8} ${y0 + 84} Q${x1 + 18} ${y0 + 50} ${x1 - 4} ${y0 + 34} Z" fill="${hairD}"/>`,
    pigtails: `<circle cx="${x0 - 12}" cy="${y0 + 40}" r="16" fill="${hairD}"/><circle cx="${x1 + 12}" cy="${y0 + 40}" r="16" fill="${hairD}"/>`
      + `<rect x="${x0 - 2}" y="${y0 + 33}" width="8" height="12" rx="3" fill="${SCARF_YELLOW}"/><rect x="${x1 - 6}" y="${y0 + 33}" width="8" height="12" rx="3" fill="${SCARF_YELLOW}"/>`,
    bun: `<circle cx="${cx}" cy="${y0 - 12}" r="17" fill="${hairC}"/><path d="M${cx - 12} ${y0 - 4} Q${cx} ${y0 - 22} ${cx + 12} ${y0 - 4}" fill="none" stroke="${hairD}" stroke-width="3"/>`,
    // locs: ropes of hair falling to the shoulders
    locs: [-1, 1].map(s => [0, 1, 2].map(i => {
      const bx = s < 0 ? x0 - 8 + i * 6 : x1 + 8 - i * 6
      return `<rect x="${bx - 4}" y="${y0 + 18}" width="8" height="${h * 0.95 - i * 8}" rx="4" fill="${i % 2 ? hairC : hairD}"/>`
    }).join('')).join(''),
    curlyLong: [...Array(5)].map((_, i) => `<circle cx="${x0 - 8}" cy="${y0 + 26 + i * 15}" r="12" fill="${hairD}"/><circle cx="${x1 + 8}" cy="${y0 + 26 + i * 15}" r="12" fill="${hairD}"/>`).join('')
      + `<rect x="${x0 - 8}" y="${y0 + 20}" width="${w + 16}" height="${h * 0.7}" rx="12" fill="${hairD}"/>`,
    braids: [-1, 1].map(s => {
      const bx = s < 0 ? x0 - 2 : x1 + 2
      return [0, 1, 2, 3].map(i => `<ellipse cx="${bx}" cy="${y0 + 44 + i * 16}" rx="9" ry="10" fill="${i % 2 ? hairD : hairC}"/>`).join('')
        + `<rect x="${bx - 5}" y="${y0 + 106}" width="10" height="7" rx="3" fill="${SCARF_YELLOW}"/>`
    }).join('')
  }
  /* Hair that sits on the head is cut from the head's own outline, a little
     enlarged, so it follows any head shape — square, round, tall, wide — with
     no gap at the temples or over the crown. `above` is the part of that
     outline kept: everything over a hairline. */
  const extraDefs: string[] = []
  let clipN = 0
  const clipTo = (d: string) => {
    const c = `hc${clipN++}-${id}`
    extraDefs.push(`<clipPath id="${c}"><path d="${d}"/></clipPath>`)
    return c
  }
  // the head's outline grown by `e` (and by `top` over the crown)
  const headShape = (e: number, top = e, fill = hairC) =>
    `<rect x="${x0 - e}" y="${y0 - top}" width="${w + 2 * e}" height="${h + e + top}" rx="${hb.r + e}" fill="${fill}"/>`
  // everything above a hairline: down to `d` of the head's height at the
  // sides, at `line` of it in the middle of the forehead
  const above = (d: number, line: number) =>
    `M-60 -60 H260 V${y0 + h * d} H${x1 + 20} Q${x1 - 6} ${y0 + h * (line + 0.02)} ${cx} ${y0 + h * line} Q${x0 + 6} ${y0 + h * (line + 0.02)} ${x0 - 20} ${y0 + h * d} H-60 Z`
  const cap = (d: number, extra = 0, line = 0.2) =>
    `<g clip-path="url(#${clipTo(above(d, line))})">${headShape(3 + extra, 6 + extra)}</g>`
  // sideburns: the head's own edge, from the temple down to `to` of its height
  const sideburnsTo = (to: number, from = 14) =>
    `<g clip-path="url(#${clipTo(`M${x0 - 20} ${y0 + from} H${x0 + 6} V${y0 + h * to} H${x0 - 20} Z M${x1 - 6} ${y0 + from} H${x1 + 20} V${y0 + h * to} H${x1 - 6} Z`)})">${headShape(3)}</g>`
  const sideburns = sideburnsTo(0.46)
  // where the top of the head is, at a given x — for curls and rows that
  // follow its curve
  const headTop = (x: number) => {
    const r = hb.r
    const dx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0
    return dx > 0 ? y0 + r - Math.sqrt(Math.max(0, r * r - dx * dx)) : y0
  }
  const along = (n: number, inset: number) => [...Array(n)].map((_, i) => x0 + inset + i * (w - 2 * inset) / (n - 1))
  const curls = (n: number, inset: number, r: number, lift: number, wobble = 0) =>
    along(n, inset).map((x, i) => `<circle cx="${x}" cy="${headTop(x) - lift + (i % 2) * wobble}" r="${r}" fill="${hairC}"/>`).join('')
  const curtains = `<path d="M${cx} ${y0 + 2} Q${cx - 26} ${y0 + h * 0.06} ${x0 + 6} ${y0 + h * 0.32} L${x0 - 6} ${y0 + h * 0.66} Z M${cx} ${y0 + 2} Q${cx + 26} ${y0 + h * 0.06} ${x1 - 6} ${y0 + h * 0.32} L${x1 + 6} ${y0 + h * 0.66} Z" fill="${hairC}"/>`
  const front: Record<string, string> = {
    none: '',
    buzz: `<g opacity=".9" clip-path="url(#${clipTo(above(0.28, 0.16))})">${headShape(1, 2)}</g>`,
    // a neat short cut, the hairline set back so more of the forehead shows
    crew: cap(0.28, 0, 0.1) + sideburnsTo(0.34, 12),
    // short, the hairline receding at the temples, a little lower in the middle
    receding: `<g clip-path="url(#${clipTo(`M-60 -60 H260 V${y0 + h * 0.36} H${x1 - 5} L${x1 - 6} ${y0 + h * 0.15} Q${x1 - 12} ${y0 + h * 0.03} ${cx + 11} ${y0 + h * 0.07} Q${cx} ${y0 + h * 0.13} ${cx - 11} ${y0 + h * 0.07} Q${x0 + 12} ${y0 + h * 0.03} ${x0 + 6} ${y0 + h * 0.15} L${x0 + 5} ${y0 + h * 0.36} H-60 Z`)})">${headShape(3, 6)}</g>`,
    short: cap(0.36) + sideburns + `<path d="M${cx - 22} ${y0 + h * 0.18} Q${cx - 4} ${y0 + h * 0.34} ${cx + 12} ${y0 + h * 0.16} Z" fill="${hairC}"/>`,
    side: cap(0.4) + sideburns + `<path d="M${x0 - 3} ${y0 + h * 0.4} Q${x0 + 4} ${y0 + h * 0.1} ${cx + 24} ${y0 + h * 0.12} Q${cx - 6} ${y0 + h * 0.2} ${x0 + 10} ${y0 + h * 0.42} Z" fill="${hairC}"/>`
      + `<path d="M${cx + 24} ${y0 + h * 0.12} Q${cx - 6} ${y0 + h * 0.2} ${x0 + 10} ${y0 + h * 0.42}" fill="none" stroke="${hairD}" stroke-width="3" stroke-linecap="round"/>`,
    // curls along the curve of the head, down to the temples
    curly: cap(0.3, 2) + curls(9, 2, 12, -2, 5) + sideburnsTo(0.36),
    afro: [...Array(7)].map((_, i) => `<circle cx="${x0 + 6 + i * (w - 12) / 6}" cy="${y0 + 8}" r="11" fill="${hairC}"/>`).join(''),
    // a short, rounded afro: a little fuller than the head, its edge in small curls
    afroShort: cap(0.34, 6, 0.19) + curls(9, 6, 6, 7),
    // short and wavy: the fringe in soft waves
    wavyShort: cap(0.34, 1) + [...Array(5)].map((_, i) => `<circle cx="${x0 + 10 + i * (w - 20) / 4}" cy="${y0 + h * 0.2}" r="${8 - Math.abs(i - 2)}" fill="${hairC}"/>`).join('') + sideburns,
    curlyLong: cap(0.4, 2) + curls(9, 2, 12, -2, 5),
    // locs: the top in ropes, with their ends hanging down the sides
    locs: (() => {
      const c = clipTo(above(0.36, 0.2))
      return `<g clip-path="url(#${c})">${headShape(5, 8)}`
        + along(7, 4).map(x => `<path d="M${x} ${headTop(x) - 4} L${x} ${y0 + h * 0.22}" stroke="${hairD}" stroke-width="2.4" stroke-linecap="round"/>`).join('')
        + `</g>` + sideburnsTo(0.6, 10)
    })(),
    // cornrows: close to the head, in rows running back from the hairline
    cornrows: (() => {
      const c = clipTo(above(0.24, 0.14))
      return `<g clip-path="url(#${c})">${headShape(1, 2)}`
        + along(5, 10).map(x => `<path d="M${x} ${y0 + h * 0.15} L${x + (x - cx) * 0.15} ${headTop(x + (x - cx) * 0.15) + 2}" stroke="${hairD}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="3 2.4"/>`).join('')
        + `</g>`
    })(),
    bob: cap(0.5, 4) + `<rect x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h * 0.24}" rx="10" fill="${hairC}"/>`,
    long: cap(0.62, 4) + curtains,
    wavy: cap(0.62, 4) + curtains,
    ponytail: cap(0.32) + `<path d="M${x0} ${y0 + h * 0.3} Q${cx - 10} ${y0 + h * 0.1} ${x1 - 4} ${y0 + h * 0.22} Q${cx} ${y0 - 2} ${x0} ${y0 + h * 0.3} Z" fill="${hairD}" opacity=".5"/>`,
    pigtails: cap(0.34) + `<path d="M${cx} ${y0 - 4} L${cx} ${y0 + h * 0.2}" stroke="${hairD}" stroke-width="2.5"/>`,
    bun: cap(0.32),
    braids: cap(0.36) + `<path d="M${cx} ${y0 - 4} L${cx} ${y0 + h * 0.2}" stroke="${hairD}" stroke-width="2.5"/>`
  }

  /* ---- ears and head ---- */
  const ears = `<rect x="${x0 - 9}" y="${ey - 8}" width="16" height="20" rx="8" fill="${skinD}"/><rect x="${x1 - 7}" y="${ey - 8}" width="16" height="20" rx="8" fill="${skinD}"/>`
  // earrings, at the lobes
  const GOLD = '#F2C230', GOLD_D = '#C99A18'
  const earrings: Record<string, string> = {
    none: '',
    studs: `<circle cx="${x0 - 1}" cy="${ey + 11}" r="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="1"/><circle cx="${x1 + 1}" cy="${ey + 11}" r="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="1"/>`,
    hoops: `<circle cx="${x0 - 1}" cy="${ey + 16}" r="5.5" fill="none" stroke="${GOLD}" stroke-width="2.4"/><circle cx="${x1 + 1}" cy="${ey + 16}" r="5.5" fill="none" stroke="${GOLD}" stroke-width="2.4"/>`
  }

  /* a scout's kit, over the shirt: a whistle or a compass on a lanyard, or
     badges sewn on (the troop's crest on the chest, a patch on the sleeve) */
  const lanyard = (endX: number, endY: number) => `<path d="M88 152 Q${(88 + endX) / 2 - 4} ${(152 + endY) / 2 + 6} ${endX} ${endY} M112 152 Q${(112 + endX) / 2 + 2} ${(152 + endY) / 2 + 8} ${endX} ${endY}" fill="none" stroke="#2B2B33" stroke-width="2.2"/>`
  const gear: Record<string, string> = {
    none: '',
    whistle: lanyard(72, 164) + `<g transform="rotate(-24 72 168)"><rect x="63" y="164" width="19" height="9.5" rx="4.75" fill="#C8D0DA"/><rect x="79" y="165" width="6" height="7.5" rx="2" fill="#AEB9C6"/><circle cx="67.5" cy="168.7" r="2.5" fill="#8E9CAF"/></g>`,
    compass: lanyard(129, 162) + `<circle cx="129" cy="168" r="9.5" fill="#C8D0DA"/><circle cx="129" cy="168" r="7" fill="#fff"/><path d="M129 162.3 L131.3 168 L129 169 Z" fill="#D8543C"/><path d="M129 173.7 L126.7 168 L129 167 Z" fill="#2B2B33"/>`,
    badges: crest(66, 166, 6.5) + `<rect x="140" y="152" width="14" height="12" rx="3" fill="#3B6452" stroke="#fff" stroke-width="1.6" transform="rotate(18 147 158)"/><path d="M144 155 l3 4 l3 -4" fill="none" stroke="${SCARF_YELLOW}" stroke-width="1.8" transform="rotate(18 147 158)"/>`
  }
  // the flame pin (7 days): bronze, on the left pocket
  const pin = a.pin === 'flame'
    ? `<g transform="translate(67 181) scale(1.3) translate(-67 -181)"><circle cx="67" cy="181" r="7" fill="#C77B3A" stroke="#8E5524" stroke-width="1.6"/>`
      + `<path d="M67 175.5 C70.5 179 71 182 69.6 184.6 C68.8 186 65.2 186 64.4 184.6 C63.2 182.4 64.2 180.6 65.4 179.8 C65.6 181.2 66.2 181.8 66.8 182 C66.2 179.6 66.4 177.4 67 175.5 Z" fill="#FFB62E"/>`
      + `<path d="M67 180.5 C68.6 182.2 68.6 184 67 185 C65.4 184 65.6 182.4 67 180.5 Z" fill="#FFE58A"/></g>`
    : ''
  // the attendance patch (5 / 10 meetings in a row): a shield on the sleeve,
  // bronze with one star or silver with two, a little tent on it
  const PATCH: Record<string, [string, string]> = { bronze: ['#C77B3A', '#8E5524'], silver: ['#C9D3DE', '#8E9CAF'] }
  const patch = PATCH[a.patch]
    ? `<g transform="translate(52 161) rotate(-18)"><path d="M-8 -9 H8 V0 Q8 8 0 12 Q-8 8 -8 0 Z" fill="${PATCH[a.patch][0]}" stroke="${PATCH[a.patch][1]}" stroke-width="1.6"/>`
      + `<path d="M-4.5 4 L0 -3 L4.5 4 Z" fill="#fff"/><path d="M0 -3 L0 4" stroke="${PATCH[a.patch][1]}" stroke-width="1"/>`
      + (a.patch === 'silver' ? `<circle cx="-3.6" cy="-6" r="1.4" fill="#FFD84A"/><circle cx="3.6" cy="-6" r="1.4" fill="#FFD84A"/>` : `<circle cx="0" cy="-6" r="1.5" fill="#FFD84A"/>`)
      + `</g>`
    : ''
  // the honour cord (20 meetings in a row): blue and gold, braided, from the
  // shoulder across the chest, with metal tips
  const cord = a.cord === 'honour'
    ? [[`M135 146 C141 166 131 181 115 179`], [`M138 149 C146 172 134 188 117 186`]].map(([d]) =>
      `<path d="${d}" fill="none" stroke="${SCARF_BLUE}" stroke-width="3.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${SCARF_YELLOW}" stroke-width="3.6" stroke-dasharray="3 3" stroke-linecap="round"/>`).join('')
      + `<rect x="111" y="176" width="6" height="9" rx="2" fill="#E3B23C" transform="rotate(20 114 180)"/>`
    : ''
  const head = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${hb.r}" fill="${skin}"/>`

  /* ---- the face: eyes, brows, nose, mouth, together by expression ---- */
  type Ex = { eyes: 'open' | 'happy' | 'half' | 'wink' | 'wide', brows: 'soft' | 'up' | 'angry' | 'flat' | 'tilt', mouth: string }
  const EXP: Record<string, Ex> = {
    smile: { eyes: 'open', brows: 'soft', mouth: 'smile' },
    grin: { eyes: 'open', brows: 'soft', mouth: 'grin' },
    laugh: { eyes: 'happy', brows: 'up', mouth: 'laugh' },
    cool: { eyes: 'half', brows: 'tilt', mouth: 'smirk' },
    surprised: { eyes: 'wide', brows: 'up', mouth: 'o' },
    silly: { eyes: 'wink', brows: 'tilt', mouth: 'tongue' },
    calm: { eyes: 'open', brows: 'flat', mouth: 'line' },
    determined: { eyes: 'open', brows: 'angry', mouth: 'flat' }
  }
  const xp = EXP[a.expression]
  const iris = a.eyeColor
  const lash = (x: number, s: number) => a.gender === 'girl'
    ? `<path d="M${x + s * 7} ${ey - 9} l${s * 5} -4 M${x + s * 9} ${ey - 5} l${s * 6} -2" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : ''
  const eye = (x: number, s: number) => {
    const kind = xp.eyes === 'wink' ? (s > 0 ? 'happy' : 'open') : xp.eyes
    if (kind === 'happy') return `<path d="M${x - 8} ${ey + 2} Q${x} ${ey - 8} ${x + 8} ${ey + 2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    // the eye's shape: round (big and friendly), almond (longer, narrower), small
    const sh = a.eyeShape
    const ry = kind === 'wide' ? 12 : sh === 'almond' ? 7.2 : sh === 'small' ? 7.8 : 10.5
    const rx = kind === 'wide' ? 10 : sh === 'almond' ? 9.6 : sh === 'small' ? 7 : 9
    const ir = kind === 'wide' ? 6.5 : sh === 'round' ? 6 : 5.2
    const iy = ey + (sh === 'round' ? 1.5 : 0.8)
    const whites = `<ellipse cx="${x}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff"/>`
      + `<circle cx="${x + 1}" cy="${iy}" r="${ir}" fill="${iris}"/>`
      + `<circle cx="${x + 1}" cy="${iy}" r="${ir / 2}" fill="${INK}"/><circle cx="${x + 3}" cy="${ey - 1.5}" r="${ir / 3}" fill="#fff"/>`
    const lid = kind === 'half'
      ? `<path d="M${x - rx - 1} ${ey - 1} Q${x} ${ey - ry - 6} ${x + rx + 1} ${ey - 1} Z" fill="${skinD}"/><path d="M${x - rx} ${ey - 1} L${x + rx} ${ey - 1}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
      : ''
    return whites + lid + lash(x, s)
  }
  const browC = a.hair === 'none' ? shade(skin, 0.55) : shade(hairC, 0.85)
  const brow = (x: number, s: number) => {
    const b = xp.brows, by = ey - 17
    const tilt = b === 'angry' ? s * 12 : b === 'tilt' ? (s > 0 ? -10 : 4) : b === 'soft' ? -s * 4 : 0
    const lift = b === 'up' ? -4 : 0
    const th = a.brows === 'thin' ? 3.4 : a.brows === 'thick' ? 8 : 5.5, bw = a.brows === 'thick' ? 21 : 18
    return `<rect x="${x - bw / 2}" y="${by + lift - (th - 5.5) / 2}" width="${bw}" height="${th}" rx="${th / 2}" fill="${browC}" transform="rotate(${tilt} ${x} ${by + lift + 3})"/>`
  }
  const eyes = eye(eyeL, -1) + eye(eyeR, 1) + brow(eyeL, -1) + brow(eyeR, 1)
  const ny = ey + 14
  const NOSE: Record<string, string> = {
    button: `<path d="M${cx - 5} ${ny + 4} Q${cx} ${ny - 6} ${cx + 5} ${ny + 4} Q${cx} ${ny + 7} ${cx - 5} ${ny + 4} Z" fill="${skinDD}"/>`,
    round: `<ellipse cx="${cx}" cy="${ny + 2}" rx="6.5" ry="5.5" fill="${skinDD}"/>`,
    long: `<path d="M${cx - 2} ${ny - 11} Q${cx + 1} ${ny - 11} ${cx + 2} ${ny - 1} Q${cx + 8} ${ny + 4} ${cx + 1} ${ny + 6.5} Q${cx - 6} ${ny + 6.5} ${cx - 4.5} ${ny + 2} Q${cx - 2.5} ${ny - 2} ${cx - 2} ${ny - 11} Z" fill="${skinDD}"/>`,
    wide: `<path d="M${cx - 9} ${ny + 4} Q${cx - 6} ${ny - 5} ${cx} ${ny - 3} Q${cx + 6} ${ny - 5} ${cx + 9} ${ny + 4} Q${cx} ${ny + 8.5} ${cx - 9} ${ny + 4} Z" fill="${skinDD}"/>`
  }
  const nose = NOSE[a.nose] || NOSE.button
  // with a moustache the mouth sits a little lower, so the two do not meet
  const my = y0 + h * 0.8 + (['moustache', 'goatee', 'beard', 'denseShort', 'shortBeard'].includes(a.facialHair) ? 4 : 0)
  const MOUTH: Record<string, string> = {
    smile: `<path d="M${cx - 12} ${my - 2} Q${cx} ${my + 9} ${cx + 12} ${my - 2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    grin: `<path d="M${cx - 16} ${my - 4} L${cx + 16} ${my - 4} Q${cx + 14} ${my + 12} ${cx} ${my + 12} Q${cx - 14} ${my + 12} ${cx - 16} ${my - 4} Z" fill="${INK}"/>`
      + `<path d="M${cx - 14} ${my - 3} L${cx + 14} ${my - 3} L${cx + 13} ${my + 2} L${cx - 13} ${my + 2} Z" fill="#fff"/>`,
    laugh: `<path d="M${cx - 15} ${my - 5} L${cx + 15} ${my - 5} Q${cx + 14} ${my + 14} ${cx} ${my + 14} Q${cx - 14} ${my + 14} ${cx - 15} ${my - 5} Z" fill="${INK}"/>`
      + `<path d="M${cx - 8} ${my + 10} Q${cx} ${my + 2} ${cx + 8} ${my + 10} Q${cx} ${my + 14} ${cx - 8} ${my + 10} Z" fill="#E26A6E"/>`
      + `<rect x="${cx - 13}" y="${my - 5}" width="26" height="4.5" rx="2" fill="#fff"/>`,
    smirk: `<path d="M${cx - 10} ${my + 2} Q${cx + 4} ${my + 6} ${cx + 13} ${my - 4}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    o: `<ellipse cx="${cx}" cy="${my + 2}" rx="7" ry="8.5" fill="${INK}"/><ellipse cx="${cx}" cy="${my + 6}" rx="4" ry="2.6" fill="#E26A6E"/>`,
    tongue: `<path d="M${cx - 13} ${my - 3} Q${cx} ${my + 8} ${cx + 13} ${my - 3}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
      + `<path d="M${cx - 2} ${my + 2} L${cx + 10} ${my + 1} Q${cx + 10} ${my + 14} ${cx + 4} ${my + 14} Q${cx - 2} ${my + 12} ${cx - 2} ${my + 2} Z" fill="#E26A6E"/>`,
    line: `<path d="M${cx - 9} ${my + 1} Q${cx} ${my + 4} ${cx + 9} ${my + 1}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    flat: `<path d="M${cx - 10} ${my + 2} L${cx + 10} ${my + 2}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
  }

  const extras: Record<string, string> = {
    none: '',
    freckles: [[-1, -3], [1, 0], [-1, 3], [1, 4], [0, 7]].flatMap(([dx, dy]) => [
      `<circle cx="${eyeL + dx * 4}" cy="${ny + dy}" r="1.8" fill="${skinDD}"/>`, `<circle cx="${eyeR - dx * 4}" cy="${ny + dy}" r="1.8" fill="${skinDD}"/>`]).join(''),
    blush: `<ellipse cx="${eyeL - 4}" cy="${ny + 6}" rx="9" ry="5" fill="#F07A86" opacity=".45"/><ellipse cx="${eyeR + 4}" cy="${ny + 6}" rx="9" ry="5" fill="#F07A86" opacity=".45"/>`,
    // a plaster on the cheek — every scout's badge of a good day out
    plaster: `<g transform="rotate(-24 ${eyeR + 4} ${ny + 5})"><rect x="${eyeR - 8}" y="${ny + 1}" width="24" height="9" rx="4.5" fill="#F3C9A0"/><rect x="${eyeR}" y="${ny + 1}" width="8" height="9" fill="#E7B587"/><circle cx="${eyeR + 2}" cy="${ny + 4}" r=".9" fill="#C99368"/><circle cx="${eyeR + 6}" cy="${ny + 7}" r=".9" fill="#C99368"/></g>`
  }
  /* facial hair, kept to the face: everything is clipped to the head's own
     shape, let down a little below the chin for a beard's fullness */
  const fh = shade(a.facialHairColor, 0.92)
  const ms = ny + 8                                   // the moustache's line, under the nose
  const tache = `<path d="M${cx - 17} ${ms + 4} C${cx - 15} ${ms - 4} ${cx - 5} ${ms - 4} ${cx} ${ms - 1} C${cx + 5} ${ms - 4} ${cx + 15} ${ms - 4} ${cx + 17} ${ms + 4} C${cx + 11} ${ms + 2} ${cx + 5} ${ms + 3} ${cx} ${ms + 2} C${cx - 5} ${ms + 3} ${cx - 11} ${ms + 2} ${cx - 17} ${ms + 4} Z" fill="${fh}"/>`
  const jaw = ey + 11                                 // where the beard starts on the cheeks, below the cheekbone
  // the beard: the lower face, its mouth left open, joined to the hair at the temples
  // its upper edge runs from the sideburns down the cheeks to the moustache's
  // ends, so the cheeks above stay clear
  const beardShape = `<path fill-rule="evenodd" d="M${x0 - 2} ${jaw} Q${x0 + 6} ${my + 2} ${cx - 17} ${ms + 4} L${cx + 17} ${ms + 4} Q${x1 - 6} ${my + 2} ${x1 + 2} ${jaw} V${y1 + 14} H${x0 - 2} Z `
    + `M${cx - 15} ${my - 3} Q${cx} ${my - 8} ${cx + 15} ${my - 3} Q${cx + 15} ${my + 11} ${cx} ${my + 12} Q${cx - 15} ${my + 11} ${cx - 15} ${my - 3} Z" fill="${fh}"/>`
    + `<rect x="${x0 - 2}" y="${y0 + h * 0.3}" width="9" height="${jaw - y0 - h * 0.3 + 2}" fill="${fh}"/><rect x="${x1 - 7}" y="${y0 + h * 0.3}" width="9" height="${jaw - y0 - h * 0.3 + 2}" fill="${fh}"/>`
  const clipped = (s: string) => `<g clip-path="url(#chin-${id})">${s}</g>`
  const onFace = (s: string) => `<g clip-path="url(#face-${id})">${s}</g>`
  const facialHair: Record<string, string> = {
    none: '',
    // a day's growth: a soft shadow over the jaw and the upper lip
    stubble: onFace(`<path d="M${x0} ${jaw + 2} Q${x0 + 8} ${my} ${cx - 16} ${ms + 3} Q${cx} ${ms - 2} ${cx + 16} ${ms + 3} Q${x1 - 8} ${my} ${x1} ${jaw + 2} V${y1} H${x0} Z" fill="${fh}" opacity=".24"/>`),
    moustache: tache,
    // a moustache joined down the corners of the mouth to a patch on the chin
    goatee: clipped(tache
      + `<path d="M${cx - 16} ${ms + 3} Q${cx - 18} ${my + 6} ${cx - 10} ${y1 + 2} L${cx + 10} ${y1 + 2} Q${cx + 18} ${my + 6} ${cx + 16} ${ms + 3} L${cx + 12} ${ms + 4} Q${cx + 13} ${my + 6} ${cx + 6} ${my + 10} L${cx - 6} ${my + 10} Q${cx - 13} ${my + 6} ${cx - 12} ${ms + 4} Z" fill="${fh}"/>`),
    // a very short beard: the beard's outline, thin and close to the skin
    shortBeard: onFace(`<g opacity=".55">${beardShape}${tache}</g>`),
    // short but dense: full, trimmed at the jawline
    denseShort: onFace(beardShape) + tache,
    // full: let down below the chin
    beard: clipped(beardShape) + tache,
    // just a tuft on the chin, no moustache
    chinPatch: onFace(`<path d="M${cx - 9} ${my + 10} Q${cx} ${my + 7} ${cx + 9} ${my + 10} Q${cx + 8} ${y1 + 2} ${cx} ${y1 + 3} Q${cx - 8} ${y1 + 2} ${cx - 9} ${my + 10} Z" fill="${fh}"/>`)
  }

  /* ---- glasses ---- */
  const gc = a.glassesColor, gy = ey
  const arms = `<path d="M${eyeL - 13} ${gy - 3} L${x0 - 2} ${gy - 6} M${eyeR + 13} ${gy - 3} L${x1 + 2} ${gy - 6}" stroke="${gc}" stroke-width="3.4" stroke-linecap="round"/>`
  const glasses: Record<string, string> = {
    none: '',
    round: `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="4"><circle cx="${eyeL}" cy="${gy}" r="13"/><circle cx="${eyeR}" cy="${gy}" r="13"/></g><path d="M${eyeL + 13} ${gy - 2} Q${cx} ${gy - 7} ${eyeR - 13} ${gy - 2}" fill="none" stroke="${gc}" stroke-width="3.4"/>` + arms,
    square: `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="4"><rect x="${eyeL - 14}" y="${gy - 11}" width="28" height="22" rx="6"/><rect x="${eyeR - 14}" y="${gy - 11}" width="28" height="22" rx="6"/></g><path d="M${eyeL + 14} ${gy - 3} L${eyeR - 14} ${gy - 3}" stroke="${gc}" stroke-width="3.4"/>` + arms,
    cateye: `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="4" stroke-linejoin="round"><path d="M${eyeL - 15} ${gy - 10} L${eyeL + 13} ${gy - 8} Q${eyeL + 13} ${gy + 11} ${eyeL} ${gy + 11} Q${eyeL - 13} ${gy + 11} ${eyeL - 15} ${gy - 10} Z"/><path d="M${eyeR + 15} ${gy - 10} L${eyeR - 13} ${gy - 8} Q${eyeR - 13} ${gy + 11} ${eyeR} ${gy + 11} Q${eyeR + 13} ${gy + 11} ${eyeR + 15} ${gy - 10} Z"/></g><path d="M${eyeL + 13} ${gy - 4} L${eyeR - 13} ${gy - 4}" stroke="${gc}" stroke-width="3.4"/>` + arms,
    sunglasses: `<path d="M${eyeL - 15} ${gy - 10} L${eyeL + 14} ${gy - 10} L${eyeL + 13} ${gy + 2} Q${eyeL + 11} ${gy + 12} ${eyeL} ${gy + 12} Q${eyeL - 12} ${gy + 12} ${eyeL - 14} ${gy + 2} Z M${eyeR + 15} ${gy - 10} L${eyeR - 14} ${gy - 10} L${eyeR - 13} ${gy + 2} Q${eyeR - 11} ${gy + 12} ${eyeR} ${gy + 12} Q${eyeR + 12} ${gy + 12} ${eyeR + 14} ${gy + 2} Z" fill="${INK}"/>`
      + `<path d="M${eyeL + 14} ${gy - 8} L${eyeR - 14} ${gy - 8}" stroke="${gc}" stroke-width="4"/><path d="M${eyeL - 15} ${gy - 10} L${eyeL + 14} ${gy - 10} M${eyeR - 14} ${gy - 10} L${eyeR + 15} ${gy - 10}" stroke="${gc}" stroke-width="4" stroke-linecap="round"/>`
      + `<path d="M${eyeL - 9} ${gy - 5} l7 0 M${eyeR - 9} ${gy - 5} l7 0" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>` + arms
  }

  /* ---- headwear ---- */
  const hw = a.headwearColor, hwD = shade(hw, 0.78), hwL = shade(hw, 1.2)
  const top = y0 - 4
  const headwear: Record<string, string> = {
    none: '',
    // the campaign hat: a wide flat brim, the crown pinched into four dents
    // (the "Montana peak"), a brown band
    scout: `<ellipse cx="${cx}" cy="${y0 + 12}" rx="${w / 2 + 34}" ry="12" fill="#A88550"/><ellipse cx="${cx}" cy="${y0 + 9}" rx="${w / 2 + 34}" ry="10" fill="#C9A267"/>`
      + `<path d="M${cx - 34} ${y0 + 10} L${cx - 28} ${y0 - 28} Q${cx - 16} ${y0 - 40} ${cx - 7} ${y0 - 31} L${cx} ${y0 - 42} L${cx + 7} ${y0 - 31} Q${cx + 16} ${y0 - 40} ${cx + 28} ${y0 - 28} L${cx + 34} ${y0 + 10} Z" fill="#C9A267"/>`
      + `<path d="M${cx + 7} ${y0 - 31} Q${cx + 16} ${y0 - 40} ${cx + 28} ${y0 - 28} L${cx + 34} ${y0 + 10} L${cx + 14} ${y0 + 10} Z" fill="#B48E55"/>`
      + `<rect x="${cx - 34}" y="${y0 - 2}" width="68" height="10" rx="3" fill="#5A3B22"/>`
      + crest(cx, y0 + 3, 7),
    beret: `<path d="M${x0 - 6} ${y0 + 12} Q${x0 - 16} ${top - 18} ${cx - 4} ${top - 22} Q${x1 + 22} ${top - 20} ${x1 + 6} ${y0 + 10} Z" fill="${hw}"/>`
      + `<rect x="${x0 - 2}" y="${y0 + 4}" width="${w + 4}" height="10" rx="5" fill="${hwD}"/><rect x="${cx - 2}" y="${top - 30}" width="5" height="10" rx="2.5" fill="${hwD}"/>`
      + crest(x0 + 20, y0 - 6, 8),
    cap: `<path d="M${x0 - 3} ${y0 + 16} Q${x0 - 4} ${top - 22} ${cx} ${top - 22} Q${x1 + 4} ${top - 22} ${x1 + 3} ${y0 + 16} Z" fill="${hw}"/>`
      + `<path d="M${x1 - 18} ${top - 18} Q${x1 + 4} ${top - 16} ${x1 + 3} ${y0 + 16} L${x1 - 10} ${y0 + 16} Q${x1 - 8} ${top - 4} ${x1 - 18} ${top - 18} Z" fill="${hwD}"/>`
      + `<path d="M${x0 - 8} ${y0 + 18} Q${cx} ${y0 + 6} ${x1 + 8} ${y0 + 18} Q${cx} ${y0 + 30} ${x0 - 8} ${y0 + 18} Z" fill="${hwD}"/>`
      + `<circle cx="${cx}" cy="${top - 20}" r="4" fill="${hwD}"/>`
      + crest(cx, top - 4, 8),
    beanie: `<path d="M${x0 - 4} ${y0 + 16} Q${x0 - 4} ${top - 26} ${cx} ${top - 26} Q${x1 + 4} ${top - 26} ${x1 + 4} ${y0 + 16} Z" fill="${hw}"/>`
      + `<rect x="${x0 - 6}" y="${y0 + 2}" width="${w + 12}" height="18" rx="7" fill="${hwD}"/>`
      + [...Array(7)].map((_, i) => `<rect x="${x0 + 2 + i * (w - 4) / 7}" y="${y0 + 4}" width="3" height="14" rx="1.5" fill="${hw}" opacity=".55"/>`).join('')
      + `<circle cx="${cx}" cy="${top - 28}" r="10" fill="${hwL}"/>`
      + crest(cx, y0 + 11, 7.5),
    // the golden campaign hat (90 days): gold felt, a red band, a red feather
    golden: `<ellipse cx="${cx}" cy="${y0 + 12}" rx="${w / 2 + 36}" ry="12.5" fill="#C99A18"/><ellipse cx="${cx}" cy="${y0 + 9}" rx="${w / 2 + 36}" ry="10.5" fill="#F2C230"/>`
      + `<path d="M${cx - 34} ${y0 + 10} L${cx - 28} ${y0 - 28} Q${cx - 16} ${y0 - 40} ${cx - 7} ${y0 - 31} L${cx} ${y0 - 42} L${cx + 7} ${y0 - 31} Q${cx + 16} ${y0 - 40} ${cx + 28} ${y0 - 28} L${cx + 34} ${y0 + 10} Z" fill="#F2C230"/>`
      + `<path d="M${cx + 7} ${y0 - 31} Q${cx + 16} ${y0 - 40} ${cx + 28} ${y0 - 28} L${cx + 34} ${y0 + 10} L${cx + 14} ${y0 + 10} Z" fill="#DDAA22"/>`
      + `<path d="M${cx - 22} ${y0 - 26} Q${cx - 14} ${y0 - 34} ${cx - 9} ${y0 - 28}" fill="none" stroke="#FFF3B8" stroke-width="2.4" stroke-linecap="round"/>`
      + `<path d="M${cx + 26} ${y0 - 1} C${cx + 34} ${y0 - 18} ${cx + 46} ${y0 - 34} ${cx + 52} ${y0 - 38} C${cx + 48} ${y0 - 22} ${cx + 40} ${y0 - 8} ${cx + 30} ${y0 + 1} Z" fill="#D8343C"/>`
      + `<path d="M${cx + 30} ${y0 - 2} C${cx + 38} ${y0 - 16} ${cx + 45} ${y0 - 28} ${cx + 50} ${y0 - 35}" fill="none" stroke="#8E1A22" stroke-width="1.2"/>`
      + `<rect x="${cx - 34}" y="${y0 - 2}" width="68" height="10" rx="3" fill="#B23A48"/>`
      + crest(cx, y0 + 3, 7.5)
  }

  /* ---- limited edition, around the avatar ---- */
  // a scene instead of the plain colour: a campfire night (40 days), the
  // northern lights (200 days)
  const stars = (pts: number[][]) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF6D8"/>`).join('')
  const scenes: Record<string, string> = {
    none: '',
    campfire: `<rect x="-40" y="-40" width="280" height="280" fill="url(#sky-${id})"/>`
      + stars([[30, 24, 1.3], [52, 12, 1], [72, 34, 0.9], [140, 16, 1.2], [176, 46, 1], [24, 66, 0.9], [168, 84, 1.1], [44, 96, 0.8], [158, 112, 0.9]])
      + `<circle cx="160" cy="32" r="11" fill="#FFF1C4"/><circle cx="165" cy="28" r="10" fill="url(#sky-${id})"/>`
      + `<ellipse cx="100" cy="206" rx="110" ry="46" fill="#FF9A3C" opacity=".32"/>`
      + [[22, 196, 34], [44, 200, 26], [168, 198, 32], [186, 200, 24]].map(([x, y, s]) =>
        `<path d="M${x} ${y - s * 2.6} L${x - s * 0.55} ${y - s * 1.5} L${x - s * 0.3} ${y - s * 1.5} L${x - s * 0.75} ${y - s * 0.6} L${x + s * 0.75} ${y - s * 0.6} L${x + s * 0.3} ${y - s * 1.5} L${x + s * 0.55} ${y - s * 1.5} Z" fill="#16233F"/>`).join(''),
    aurora: `<rect x="-40" y="-40" width="280" height="280" fill="url(#night-${id})"/>`
      + stars([[24, 20, 1.2], [62, 10, 0.9], [120, 22, 1], [178, 14, 1.3], [16, 70, 0.9], [184, 62, 1], [36, 118, 0.8], [170, 120, 0.9]])
      + `<path d="M-20 64 C20 30 50 70 92 44 C130 20 160 54 220 30 L220 58 C164 82 130 50 94 74 C54 98 22 60 -20 92 Z" fill="url(#aur-${id})" opacity=".75"/>`
      + `<path d="M-20 96 C24 70 60 104 100 82 C140 60 168 92 220 70 L220 86 C170 106 138 78 102 98 C62 120 26 90 -20 112 Z" fill="url(#aur-${id})" opacity=".4"/>`
      + `<path d="M150 18 L118 40" stroke="url(#shoot-${id})" stroke-width="2.4" stroke-linecap="round"/><circle cx="118" cy="40" r="1.8" fill="#fff"/>`
  }
  // a sunrise over the mountains (40 meetings in a row)
  scenes.sunrise = `<rect x="-40" y="-40" width="280" height="280" fill="url(#dawn-${id})"/>`
    + `<circle cx="150" cy="122" r="26" fill="#FFE07A"/><circle cx="150" cy="122" r="38" fill="#FFE07A" opacity=".25"/>`
    + `<path d="M-40 150 L20 92 L58 128 L96 84 L150 140 L196 100 L240 140 V240 H-40 Z" fill="#7FA6C9"/>`
    + `<path d="M-40 168 L30 120 L80 158 L130 118 L182 160 L240 130 V240 H-40 Z" fill="#4E8B6A"/>`
    + [[26, 186, 22], [176, 190, 20]].map(([x, y, s]) =>
      `<path d="M${x} ${y - s * 2.4} L${x - s * 0.55} ${y - s * 1.3} L${x - s * 0.3} ${y - s * 1.3} L${x - s * 0.75} ${y - s * 0.4} L${x + s * 0.75} ${y - s * 0.4} L${x + s * 0.3} ${y - s * 1.3} L${x + s * 0.55} ${y - s * 1.3} Z" fill="#2F6B4A"/>`).join('')
  const sceneDefs = a.scene === 'sunrise'
    ? `<linearGradient id="dawn-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EC5F0"/><stop offset=".55" stop-color="#FFC7A1"/><stop offset="1" stop-color="#FFE3B0"/></linearGradient>`
    : a.scene === 'campfire'
    ? `<linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14203D"/><stop offset="1" stop-color="#3A3F6B"/></linearGradient>`
    : a.scene === 'aurora'
      ? `<linearGradient id="night-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1630"/><stop offset="1" stop-color="#1D2E55"/></linearGradient>`
        + `<linearGradient id="aur-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3BE3A0"/><stop offset=".55" stop-color="#2FC6D8"/><stop offset="1" stop-color="#A67BF0"/></linearGradient>`
        + `<linearGradient id="shoot-${id}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`
      : ''

  // the legend's wings (300 days): golden phoenix wings behind the shoulders,
  // fanned out, with sparks about them
  // each feather a long drop from the shoulder; the outer ones longest and
  // reddest, rising up and out like a phoenix's
  const feathers = (list: { ang: number, len: number, wid: number, c: string }[]) => list.map(f => {
    const r = f.ang * Math.PI / 180, bx = 74, by = 150
    const tx = bx + Math.cos(r) * f.len, ty = by + Math.sin(r) * f.len
    const nx = -Math.sin(r) * f.wid, ny = Math.cos(r) * f.wid
    const mx = bx + Math.cos(r) * f.len * 0.55, my = by + Math.sin(r) * f.len * 0.55
    return `<path d="M${bx} ${by} Q${mx + nx} ${my + ny} ${tx} ${ty} Q${mx - nx} ${my - ny} ${bx} ${by} Z" fill="${f.c}"/>`
  }).join('')
  const wing = feathers([
    ...[-178, -160, -142, -124, -106].map((ang, i) => ({ ang, len: 58 + i * 6, wid: 13, c: '#E2582A' })),
    ...[-170, -152, -134, -116].map((ang, i) => ({ ang, len: 46 + i * 5, wid: 11, c: '#F29A2E' })),
    ...[-160, -140, -120].map((ang, i) => ({ ang, len: 32 + i * 4, wid: 9, c: '#FFD24A' }))
  ])
  const aura = a.aura === 'legend'
    ? `<circle cx="100" cy="${y0 + h / 2}" r="${Math.max(w, h) / 2 + 18}" fill="#FFE58A" opacity=".22"/>`
      + `<g>${wing}</g><g transform="translate(200 0) scale(-1 1)">${wing}</g>`
      + [[34, 40], [166, 36], [22, 108], [178, 104], [100, 12]].map(([x, y]) =>
        `<path d="M${x} ${y - 5} l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z" fill="#FFF3B8"/>`).join('')
    : ''

  // the phoenix companion (150 days): a little one on the right shoulder
  const companion = a.companion === 'phoenix'
    ? `<g transform="translate(150 144) scale(1.3)">`
      + `<path d="M6 6 C14 10 18 18 22 24 C14 22 9 18 5 12 Z" fill="#E8462A"/><path d="M5 8 C11 13 13 19 15 24 C9 21 6 16 3 11 Z" fill="#FFB62E"/>`
      + `<ellipse cx="0" cy="4" rx="8.5" ry="9.5" fill="#F29A2E"/><ellipse cx="-2" cy="7" rx="5" ry="5.5" fill="#FFD27A"/>`
      + `<path d="M3 0 C10 -2 14 4 12 11 C8 9 4 6 3 0 Z" fill="#E0661F"/>`
      + `<circle cx="-2" cy="-8" r="7" fill="#F7B23B"/>`
      + `<path d="M-4 -14 C-6 -20 -3 -23 -1 -25 C-1 -21 1 -19 0 -14 Z M0 -14 C1 -19 4 -21 6 -22 C5 -18 4 -16 2 -13 Z M-7 -12 C-11 -16 -11 -19 -10 -21 C-8 -18 -6 -16 -5 -13 Z" fill="#E8462A"/>`
      + `<circle cx="-5" cy="-9" r="1.8" fill="${INK}"/><circle cx="-5.5" cy="-9.6" r=".6" fill="#fff"/>`
      + `<path d="M-9 -7 L-14 -5.5 L-9 -4.5 Z" fill="#FFD84A"/>`
      + `<path d="M-3 13 l-1 4 M1 13 l1 4" stroke="#C26A1E" stroke-width="1.6" stroke-linecap="round"/>`
      + `</g>`
    : ''
  // a hat covers the top of the hair; long hair still shows at the sides
  const coversTop = ['scout', 'beret', 'cap', 'beanie'].includes(a.headwear)
  const hairFront = coversTop ? `<g clip-path="url(#under-${id})">${front[a.hair] || ''}</g>` : (front[a.hair] || '')
  const hairBack = coversTop && a.hair === 'bun' ? '' : (back[a.hair] || '')
  const hatTop = a.headwear === 'scout' ? y0 + 6 : y0 + 14

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW[crop]}">`
    + `<defs>`
    + `<pattern id="st-${id}" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(-35)"><rect width="9" height="9" fill="${SCARF_BLUE}"/><rect width="4" height="9" fill="${SCARF_YELLOW}"/></pattern>`
    + `<clipPath id="under-${id}"><rect x="0" y="${hatTop}" width="200" height="200"/></clipPath>`
    + `<clipPath id="chin-${id}"><rect x="${x0 - 1}" y="${y0}" width="${w + 2}" height="${h + 10}" rx="${hb.r}"/></clipPath>`
    + extraDefs.join('') + sceneDefs
    + `<clipPath id="face-${id}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${hb.r}"/></clipPath>`
    + `</defs>`
    + `<rect x="-40" y="-40" width="280" height="280" fill="${a.bg}"/>` + scenes[a.scene] + aura
    + hairBack + clothes[a.clothes] + scarfBack + neck + scarfFront + gear[a.gear] + pin + patch + cord
    + ears + head + earrings[a.earrings] + extras[a.extras] + eyes + nose + facialHair[a.facialHair] + (MOUTH[xp.mouth] || '')
    + hairFront + glasses[a.glasses] + headwear[a.headwear] + companion
    + `</svg>`
}

/* The builder's tabs, in order. Each is a list of cards: one choice, shown
   as tiles zoomed in on what it changes, with its own colours under it — the
   clothes and their colour together, the hairstyle and its colour… — or a
   card of colours alone (skin, background). */
export type AvatarSection = { field: K, crop?: Crop, color?: K }
export const AVATAR_TABS: ReadonlyArray<{ key: string, icon: string, sections: ReadonlyArray<AvatarSection> }> = [
  // the first question, on its own: the rest of the choices follow from it
  { key: 'gender', icon: 'gender', sections: [{ field: 'gender', crop: 'head' }] },
  { key: 'body', icon: 'body', sections: [{ field: 'skin' }, { field: 'head', crop: 'head' }] },
  { key: 'hair', icon: 'hair', sections: [{ field: 'hair', crop: 'head', color: 'hairColor' }] },
  { key: 'face', icon: 'face', sections: [
    { field: 'expression', crop: 'face', color: 'eyeColor' }, { field: 'eyeShape', crop: 'face' }, { field: 'brows', crop: 'face' },
    { field: 'nose', crop: 'face' }, { field: 'extras', crop: 'face' }, { field: 'earrings', crop: 'face' },
    { field: 'facialHair', crop: 'face', color: 'facialHairColor' }
  ] },
  { key: 'clothes', icon: 'clothes', sections: [{ field: 'clothes', crop: 'body', color: 'clothesColor' }, { field: 'gear', crop: 'body' }] },
  { key: 'glasses', icon: 'glasses', sections: [{ field: 'glasses', crop: 'face', color: 'glassesColor' }] },
  { key: 'headwear', icon: 'hat', sections: [{ field: 'headwear', crop: 'head', color: 'headwearColor' }] },
  { key: 'bg', icon: 'frame', sections: [{ field: 'bg' }] },
  // the limited-edition collection, earned with the quiz streak
  { key: 'rewards', icon: 'trophy', sections: [] }
]
