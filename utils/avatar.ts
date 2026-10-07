/* A member's avatar, built from choices and drawn as a flat, chunky cartoon
   SVG — rounded-square heads, big white eyes, solid colours with a second,
   deeper flat tone for shade, no outlines. Everyone wears the troop's
   neckerchief in its blue and yellow stripes, through the brown leather
   woggle, exactly as the phoenix does (components/MascotPhoenix.vue).

   The same function draws the avatar everywhere, and the builder's tiles,
   zoomed in on what each choice changes. */

import { currentSeason } from './season'

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
  headwear: ['none', 'scout', 'beret', 'cap', 'beanie', 'golden', 'santa', 'straw'],
  /* limited edition: earned by keeping the quiz streak, never chosen freely
     (see STREAK_REWARDS) — a pin, the woggle, a scene, a companion, an aura */
  pin: ['none', 'flame', 'egg'],
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
  { track: 'attendance', days: 40, key: 'sunrise', field: 'scene', value: 'sunrise', crop: 'full' },
  // seasonal: won by taking part (a quiz answer, a meeting, a photo mission)
  // while the season lasts — see SEASON_OF and utils/season.ts
  { track: 'season', days: 0, key: 'santaHat', field: 'headwear', value: 'santa', crop: 'head' },
  { track: 'season', days: 0, key: 'redEgg', field: 'pin', value: 'egg', crop: 'body' },
  { track: 'season', days: 0, key: 'strawHat', field: 'headwear', value: 'straw', crop: 'head' }
] as const
/** Which season each seasonal item belongs to. */
export const SEASON_OF: Record<string, 'christmas' | 'easter' | 'summer'> = { santaHat: 'christmas', redEgg: 'easter', strawHat: 'summer' }
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
export type Crop = 'full' | 'face' | 'head' | 'body' | 'stand'
const VIEW: Record<Crop, string> = {
  // the whole avatar, framed so the face fills it and the woggle still shows
  full: '16 6 168 168', face: '46 26 108 108', head: '22 -4 156 156', body: '20 100 160 100',
  // the whole figure, standing: arms, shorts, socks and boots below the shirt
  stand: '8 -6 184 352'
}

/** The SVG, as markup. `id` keeps its patterns apart from another avatar's
    on the same page. */
export function avatarSvg(a0: Partial<Avatar> | null | undefined, id = 'a', crop: Crop = 'full', opts: { party?: boolean } = {}): string {
  const a: any = normalizeAvatar(a0 || {})
  // a season's item is worn only while its season lasts
  const season = currentSeason()
  for (const r of STREAK_REWARDS)
    if (r.track === 'season' && a[r.field] === r.value && SEASON_OF[r.key] !== season) a[r.field] = (DEFAULT_AVATAR as any)[r.field]
  const skin = a.skin, skinD = shade(skin, 0.86), skinDD = shade(skin, 0.72)
  const hairC = a.hairColor, hairD = shade(hairC, 0.78)
  // the hair's fill: its colour with a little light at the top, for depth
  const hairF = `url(#hg-${id})`
  const hairL = shade(hairC, 1.4), hairDD = shade(hairC, 0.6)
  // one curl: round, a shadow along its lower edge, a glint up top
  const curl = (x: number, y: number, r: number, fill = hairF) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`
    + `<path d="M${x - r * 0.75} ${y + r * 0.35} Q${x} ${y + r * 1.05} ${x + r * 0.75} ${y + r * 0.35}" fill="none" stroke="${hairDD}" stroke-width="${Math.max(1.4, r * 0.22)}" stroke-linecap="round" opacity=".55"/>`
    + `<circle cx="${x - r * 0.32}" cy="${y - r * 0.36}" r="${r * 0.26}" fill="${hairL}" opacity=".55"/>`
  // strands: a few soft lines down a fall of hair
  const strands = (pts: number[][], col = hairDD, wd = 2) => pts.map(([ax, ay, bx, by, qx, qy]) =>
    `<path d="M${ax} ${ay} Q${qx} ${qy} ${bx} ${by}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round" opacity=".5"/>`).join('')
  const cx = 100
  const extraDefs: string[] = []
  let clipN = 0
  const clipTo = (d: string) => {
    const c = `hc${clipN++}-${id}`
    extraDefs.push(`<clipPath id="${c}"><path d="${d}"/></clipPath>`)
    return c
  }

  /* the head: a rounded square, of four proportions */
  const HB: Record<string, { w: number, h: number, r: number }> = {
    square: { w: 86, h: 84, r: 30 }, round: { w: 88, h: 88, r: 42 }, tall: { w: 78, h: 96, r: 34 }, wide: { w: 100, h: 80, r: 32 }
  }
  const hb = HB[a.head]
  const x0 = cx - hb.w / 2, y0 = 124 - hb.h, w = hb.w, h = hb.h, x1 = x0 + w, y1 = y0 + h
  const ey = y0 + h * 0.5, ex = w * 0.2, eyeL = cx - ex, eyeR = cx + ex

  /* ---- body, clothes, neck ---- */
  const cc = a.clothesColor, ccD = shade(cc, 0.82), ccL = shade(cc, 1.25), ccDD = shade(cc, 0.66)
  const TORSO = 'M34 200 L44 162 Q50 144 72 140 L128 140 Q150 144 156 162 L166 200 Z'
  const torso = `<path d="${TORSO}" fill="${cc}"/>`
    + `<path d="M34 200 L44 162 Q47 154 54 149 L60 200 Z M166 200 L156 162 Q153 154 146 149 L140 200 Z" fill="${ccD}"/>`
  // whatever is drawn across the chest stays inside the body
  const onBody = (s: string) => `<g clip-path="url(#${clipTo(TORSO)})">${s}</g>`
  // sleeves: a seam where each meets the body
  const seams = `<path d="M54 149 Q60 170 58 200 M146 149 Q140 170 142 200" fill="none" stroke="${ccDD}" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>`
  const shoulderLight = `<path d="M50 160 Q56 148 70 144" fill="none" stroke="${ccL}" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M150 160 Q144 148 130 144" fill="none" stroke="${ccL}" stroke-width="3" stroke-linecap="round" opacity=".35"/>`
  // a button with a glint
  const button = (x: number, y: number, r = 2.2, fill = ccDD) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.4}" fill="#fff" opacity=".45"/>`
  // a chest pocket: a pointed flap with its button, a pleat down the middle
  const pocket = (x: number) => `<rect x="${x - 12}" y="163" width="24" height="28" rx="4" fill="${ccD}" stroke="${ccDD}" stroke-width="1.4"/>`
    + `<path d="M${x} 172 V190" stroke="${ccDD}" stroke-width="1.6" opacity=".7"/>`
    + `<path d="M${x - 13.5} 160 H${x + 13.5} V167 L${x} 173 L${x - 13.5} 167 Z" fill="${shade(cc, 0.74)}" stroke="${ccDD}" stroke-width="1.4" stroke-linejoin="round"/>` + button(x, 167.5, 2.1)
  // a light colour shows its pattern in a darker one, the rest in cream
  const light = parseInt(cc.slice(1, 3), 16) + parseInt(cc.slice(3, 5), 16) + parseInt(cc.slice(5, 7), 16) > 560
  const knit = light ? shade(cc, 0.62) : '#F4E8CF'
  // the arms below a short sleeve, with the sleeve's hem
  const arm = (side: 1 | -1) => {
    const X = (x: number) => cx + side * (x - cx)
    return `<path d="M${X(34)} 200 L${X(39)} 182 L${X(54)} 185 L${X(55)} 200 Z" fill="${skin}"/>`
      + `<path d="M${X(34)} 200 L${X(39)} 182 L${X(44)} 183 L${X(41)} 200 Z" fill="${skinD}"/>`
      + `<path d="M${X(38)} 181 L${X(55)} 184.5" stroke="${ccD}" stroke-width="5" stroke-linecap="round"/>`
  }
  const clothes: Record<string, string> = {
    // the scout shirt: a wide pointed collar, two pockets with flaps,
    // epaulettes with brass buttons, buttons down the front
    uniform: torso + seams + shoulderLight
      + onBody(pocket(68) + pocket(132) + `<path d="M100 170 V200" stroke="${ccDD}" stroke-width="1.6" opacity=".6"/>` + button(100, 182) + button(100, 195))
      + `<path d="M72 140 L95 157 L83 168 L61 146 Z M128 140 L105 157 L117 168 L139 146 Z" fill="${shade(cc, 1.1)}" stroke="${ccDD}" stroke-width="1.6" stroke-linejoin="round"/>`
      + `<path d="M46 154 L67 145 L70 151 L49 160 Z M154 154 L133 145 L130 151 L151 160 Z" fill="${ccD}" stroke="${ccDD}" stroke-width="1.4" stroke-linejoin="round"/>`
      + button(64, 148.5, 2.4, '#C99A18') + button(136, 148.5, 2.4, '#C99A18'),
    // a plain t-shirt: short sleeves, a ribbed crew neck
    tee: torso + shoulderLight + arm(1) + arm(-1)
      + `<path d="M78 141 Q100 160 122 141" fill="none" stroke="${ccDD}" stroke-width="8" stroke-linecap="round"/><path d="M78 141 Q100 160 122 141" fill="none" stroke="${ccD}" stroke-width="4.5" stroke-linecap="round"/>`
      + onBody(`<path d="M72 186 Q76 192 74 200 M128 186 Q124 192 126 200" fill="none" stroke="${ccD}" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`),
    // a hoodie: the hood round the neck, drawstrings with metal tips, the
    // pocket across the front
    hoodie: `<path d="M54 156 Q50 120 100 118 Q150 120 146 156 Q124 140 100 140 Q76 140 54 156 Z" fill="${ccD}"/>`
      + `<path d="M62 152 Q62 130 100 128 Q138 130 138 152" fill="none" stroke="${ccDD}" stroke-width="3" opacity=".6"/>` + torso + seams + shoulderLight
      + `<path d="M72 142 Q74 156 86 160 M128 142 Q126 156 114 160" fill="none" stroke="${ccDD}" stroke-width="5" stroke-linecap="round" opacity=".55"/>`
      + `<path d="M84 158 Q81 168 82 180 M116 158 Q119 168 118 180" fill="none" stroke="#F4F1E8" stroke-width="3.2" stroke-linecap="round"/>`
      + `<rect x="79.5" y="179" width="5" height="9" rx="2" fill="#3A3A40"/><rect x="115.5" y="179" width="5" height="9" rx="2" fill="#3A3A40"/>`
      + onBody(`<path d="M62 202 L68 186 Q70 180 78 180 L122 180 Q130 180 132 186 L138 202 Z" fill="${ccD}" stroke="${ccDD}" stroke-width="1.6"/>`
        + `<path d="M68 186 Q78 190 76 202 M132 186 Q122 190 124 202" fill="none" stroke="${ccDD}" stroke-width="2.2" stroke-linecap="round"/>`),
    // a knitted sweater: the zigzag band across the chest, a ribbed neck
    sweater: torso + seams + shoulderLight
      + onBody(`<rect x="30" y="160" width="140" height="18" fill="${ccD}"/>`
        + `<path d="M30 175 ${[...Array(15)].map((_, i) => `L${36 + i * 9.5} ${i % 2 ? 175 : 164}`).join(' ')}" fill="none" stroke="${knit}" stroke-width="4.6" stroke-linejoin="round"/>`
        + `<path d="M30 159 H170 M30 179 H170" stroke="${ccDD}" stroke-width="1.6" opacity=".6"/>`
        + [...Array(18)].map((_, i) => `<path d="M${38 + i * 7} 186 v14" stroke="${ccD}" stroke-width="1.6" opacity=".6"/>`).join(''))
      + `<path d="M78 141 Q100 162 122 141" fill="none" stroke="${ccDD}" stroke-width="10" stroke-linecap="round"/>`
  }
  /* standing (crop 'stand'): the shirt carries on to the waist, a belt with
     its buckle, scout shorts, knees, green socks with their red garter tabs,
     boots; the arms hang at the sides, sleeves then hands */
  const standing = crop === 'stand'
  const SHORTS = '#2F3E55', SHORTS_D = '#232F42', SOCK = '#3B6452', SOCK_D = '#2C4C3E', BOOT = '#3A2A20'
  const lowerBody = !standing ? '' :
    `<path d="M34 198 L166 198 L153 252 L47 252 Z" fill="${cc}"/><path d="M34 198 L47 252 L58 252 L52 198 Z M166 198 L153 252 L142 252 L148 198 Z" fill="${ccD}"/>`
    + `<path d="M48 250 L100 250 L98 294 L58 294 Z M100 250 L152 250 L142 294 L102 294 Z" fill="${SHORTS}"/>`
    + `<path d="M100 254 V290 M58 294 L98 294 M102 294 L142 294" stroke="${SHORTS_D}" stroke-width="2"/>`
    + `<rect x="47" y="241" width="106" height="11" rx="3" fill="#5A3B22"/><rect x="93" y="240" width="14" height="13" rx="2.5" fill="#C99A18"/><rect x="96.5" y="243" width="7" height="7" rx="1.5" fill="#5A3B22"/>`
    + [[63, 92], [108, 137]].map(([a, b]) => `<rect x="${a}" y="292" width="${b - a}" height="22" fill="${skin}"/><rect x="${b - 7}" y="292" width="7" height="22" fill="${skinD}"/>`
      + `<rect x="${a - 2}" y="310" width="${b - a + 4}" height="22" rx="4" fill="${SOCK}"/><rect x="${a - 2}" y="310" width="${b - a + 4}" height="6" rx="3" fill="${SOCK_D}"/>`
      + `<path d="M${b - 4} 312 l5 0 l-1 9 l-3 -3 Z" fill="#C8303A"/>`
      + `<ellipse cx="${(a + b) / 2 + (a < 100 ? -4 : 4)}" cy="335" rx="${(b - a) / 2 + 8}" ry="9" fill="${BOOT}"/><ellipse cx="${(a + b) / 2 + (a < 100 ? -6 : 2)}" cy="332" rx="6" ry="2.5" fill="#fff" opacity=".18"/>`).join('')
  const standArms = !standing ? '' : [-1, 1].map(sd => {
    const X = (x: number) => cx + sd * (x - cx)
    return `<path d="M${X(52)} 150 Q${X(34)} 158 ${X(28)} 200 L${X(44)} 204 Q${X(48)} 176 ${X(60)} 162 Z" fill="${cc}"/>`
      + `<path d="M${X(52)} 150 Q${X(34)} 158 ${X(28)} 200 L${X(34)} 201 Q${X(38)} 170 ${X(52)} 156 Z" fill="${ccD}"/>`
      + `<path d="M${X(29)} 199 L${X(43)} 203 L${X(41)} 238 L${X(30)} 237 Z" fill="${skin}"/>`
      + `<circle cx="${X(35.5)}" cy="${242}" r="8.5" fill="${skin}"/><path d="M${X(29)} 244 Q${X(35.5)} 251 ${X(42)} 244" fill="none" stroke="${skinD}" stroke-width="2" stroke-linecap="round"/>`
  }).join('')
  const neck = `<rect x="${cx - 15}" y="${y1 - 14}" width="30" height="${154 - y1 + 14}" rx="8" fill="${skinD}"/>`
    + `<ellipse cx="${cx}" cy="${y1 + 1}" rx="15" ry="5" fill="${skinDD}" opacity=".55"/>`

  /* the woggle: brown leather; silver with the crest (20 days); gold with a
     red stone (60 days) */
  const WOGGLES: Record<string, string> = {
    classic: `<rect x="90.5" y="159" width="19" height="13" rx="5.5" fill="${WOGGLE}"/><rect x="90.5" y="165.5" width="19" height="6.5" rx="3.2" fill="${WOGGLE_D}"/><rect x="93" y="160.6" width="8" height="2.2" rx="1.1" fill="#B07A47" opacity=".9"/>`,
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
    long: `<path d="M${x0 - 10} ${y0 + 26} Q${x0 - 14} ${y1 + 26} ${x0 - 4} ${y1 + 36} L${x1 + 4} ${y1 + 36} Q${x1 + 14} ${y1 + 26} ${x1 + 10} ${y0 + 26} Z" fill="${hairD}"/>`
      + strands([[x0 - 5, y0 + 34, x0 - 1, y1 + 30, x0 - 9, y1], [x1 + 5, y0 + 34, x1 + 1, y1 + 30, x1 + 9, y1]]),
    wavy: `<path d="M${x0 - 10} ${y0 + 26} Q${x0 - 16} ${y1 + 16} ${x0 - 8} ${y1 + 30} q8 9 15 0 q8 9 15 0 L${x1 - 8} ${y1 + 30} q8 9 15 0 Q${x1 + 16} ${y1 + 16} ${x1 + 10} ${y0 + 26} Z" fill="${hairD}"/>`,
    bob: `<path d="M${x0 - 9} ${y0 + 20} Q${x0 - 12} ${y1 - 4} ${x0 - 6} ${y1 + 2} L${x1 + 6} ${y1 + 2} Q${x1 + 12} ${y1 - 4} ${x1 + 9} ${y0 + 20} Z" fill="${hairD}"/>`,
    afro: `<rect x="${x0 - 22}" y="${y0 - 24}" width="${w + 44}" height="${h * 0.86 + 24}" rx="${(w + 44) / 2.3}" fill="${hairF}"/>`
      + [[-0.36, -12], [-0.16, -18], [0.08, -19], [0.3, -15], [-0.42, 8], [0.42, 6], [-0.44, 28], [0.44, 26]].map(([fx, dy]) =>
        `<path d="M${cx + fx * (w + 30) - 5} ${y0 + dy} q5 -6 10 0" fill="none" stroke="${hairL}" stroke-width="2.2" stroke-linecap="round" opacity=".45"/>`).join(''),
    ponytail: `<path d="M${x1 - 6} ${y0 + 16} Q${x1 + 34} ${y0 + 10} ${x1 + 26} ${y0 + 60} Q${x1 + 22} ${y0 + 80} ${x1 + 8} ${y0 + 84} Q${x1 + 18} ${y0 + 50} ${x1 - 4} ${y0 + 34} Z" fill="${hairD}"/>`
      + strands([[x1 + 6, y0 + 22, x1 + 14, y0 + 74, x1 + 24, y0 + 44], [x1 + 14, y0 + 20, x1 + 20, y0 + 64, x1 + 30, y0 + 38]])
      + `<rect x="${x1 - 6}" y="${y0 + 14}" width="9" height="12" rx="3" fill="#8B5A2E" transform="rotate(-20 ${x1 - 2} ${y0 + 20})"/>`,
    pigtails: curl(x0 - 12, y0 + 40, 16, hairD) + curl(x1 + 12, y0 + 40, 16, hairD)
      + `<rect x="${x0 - 2}" y="${y0 + 33}" width="8" height="12" rx="3" fill="${SCARF_YELLOW}"/><rect x="${x1 - 6}" y="${y0 + 33}" width="8" height="12" rx="3" fill="${SCARF_YELLOW}"/>`,
    bun: curl(cx, y0 - 12, 17) + `<path d="M${cx - 12} ${y0 - 4} Q${cx} ${y0 - 22} ${cx + 12} ${y0 - 4}" fill="none" stroke="${hairD}" stroke-width="3"/>`
      + `<path d="M${cx - 8} ${y0 - 18} Q${cx} ${y0 - 26} ${cx + 9} ${y0 - 17}" fill="none" stroke="${hairDD}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`,
    // locs: ropes of hair falling to the shoulders
    locs: [-1, 1].map(s => [0, 1, 2].map(i => {
      const bx = s < 0 ? x0 - 8 + i * 6 : x1 + 8 - i * 6
      return `<rect x="${bx - 4}" y="${y0 + 18}" width="8" height="${h * 0.95 - i * 8}" rx="4" fill="${i % 2 ? hairF : hairD}"/>`
        + `<path d="M${bx - 1.5} ${y0 + 22} V${y0 + 14 + h * 0.95 - i * 8}" stroke="${hairL}" stroke-width="1.3" stroke-linecap="round" opacity=".4"/>`
    }).join('')).join(''),
    curlyLong: [...Array(5)].map((_, i) => curl(x0 - 8, y0 + 26 + i * 15, 12, hairD) + curl(x1 + 8, y0 + 26 + i * 15, 12, hairD)).join('')
      + `<rect x="${x0 - 8}" y="${y0 + 20}" width="${w + 16}" height="${h * 0.7}" rx="12" fill="${hairD}"/>`,
    braids: [-1, 1].map(s => {
      const bx = s < 0 ? x0 - 2 : x1 + 2
      return [0, 1, 2, 3].map(i => `<ellipse cx="${bx}" cy="${y0 + 44 + i * 16}" rx="9" ry="10" fill="${i % 2 ? hairD : hairF}"/>`
        + `<path d="M${bx - 6} ${y0 + 48 + i * 16} Q${bx} ${y0 + 54 + i * 16} ${bx + 6} ${y0 + 48 + i * 16}" fill="none" stroke="${hairDD}" stroke-width="1.6" opacity=".55"/>`
        + `<circle cx="${bx - 3}" cy="${y0 + 40 + i * 16}" r="2.2" fill="${hairL}" opacity=".5"/>`).join('')
        + `<rect x="${bx - 5}" y="${y0 + 106}" width="10" height="7" rx="3" fill="${SCARF_YELLOW}"/>`
    }).join('')
  }
  /* Hair that sits on the head is cut from the head's own outline, a little
     enlarged, so it follows any head shape — square, round, tall, wide — with
     no gap at the temples or over the crown. `above` is the part of that
     outline kept: everything over a hairline. */
  // the head's outline grown by `e` (and by `top` over the crown)
  const headShape = (e: number, top = e, fill = hairF) =>
    `<rect x="${x0 - e}" y="${y0 - top}" width="${w + 2 * e}" height="${h + e + top}" rx="${hb.r + e}" fill="${fill}"/>`
  // everything above a hairline: down to `d` of the head's height at the
  // sides — a strip along the head's own edge, so the hair wraps the temples
  // with no skin between it and the ears — and at `line` of it across the
  // forehead, the corners rounded
  const T = 9
  const above = (d: number, line: number) => {
    const yl = y0 + h * line, yd = y0 + h * d
    return `M-60 -60 H260 V${yd} H${x1 - T} Q${x1 - T} ${yl} ${x1 - T - 16} ${yl} H${x0 + T + 16} Q${x0 + T} ${yl} ${x0 + T} ${yd} H-60 Z`
  }
  const cap = (d: number, extra = 0, line = 0.2) =>
    `<g clip-path="url(#${clipTo(above(d, line))})">${headShape(3 + extra, 10 + extra)}</g>`
  // sideburns: the head's own edge, from the temple down to `to` of its height
  // (as wide as the hair's own strip, tapering to a point at the bottom)
  const sideburnsTo = (to: number, from = 14) =>
    `<g clip-path="url(#${clipTo(`M${x0 - 20} ${y0 + from} H${x0 + T} V${y0 + h * to - 6} L${x0 + 2} ${y0 + h * to} H${x0 - 20} Z M${x1 - T} ${y0 + from} H${x1 + 20} V${y0 + h * to} H${x1 - 2} L${x1 - T} ${y0 + h * to - 6} Z`)})">${headShape(3)}</g>`
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
    along(n, inset).map((x, i) => curl(x, headTop(x) - lift + (i % 2) * wobble, r)).join('')
  const curtains = `<path d="M${cx} ${y0 + 2} Q${cx - 26} ${y0 + h * 0.06} ${x0 + 6} ${y0 + h * 0.32} L${x0 - 6} ${y0 + h * 0.66} Z M${cx} ${y0 + 2} Q${cx + 26} ${y0 + h * 0.06} ${x1 - 6} ${y0 + h * 0.32} L${x1 + 6} ${y0 + h * 0.66} Z" fill="${hairF}"/>`
    + strands([[cx - 6, y0 + 6, x0 + 2, y0 + h * 0.5, cx - 22, y0 + h * 0.12], [cx + 6, y0 + 6, x1 - 2, y0 + h * 0.5, cx + 22, y0 + h * 0.12]], hairDD, 1.8)
  // a fringe swept from a side parting across the brow, for hair tied back
  const sweep = `<path d="M${cx + 10} ${y0 - 6} Q${cx - 18} ${y0 - 2} ${x0 + 2} ${y0 + h * 0.34} L${x0 - 3} ${y0 + h * 0.3} Q${x0 - 2} ${y0 - 8} ${cx + 10} ${y0 - 9} Z" fill="${hairF}"/>`
    + `<path d="M${cx + 10} ${y0 - 6} Q${cx - 14} ${y0 + 2} ${x0 + 6} ${y0 + h * 0.3}" fill="none" stroke="${hairDD}" stroke-width="1.8" stroke-linecap="round" opacity=".45"/>`
    + `<path d="M${cx + 12} ${y0 - 6} Q${cx + 4} ${y0 + h * 0.1} ${cx - 10} ${y0 + h * 0.2} Q${cx + 6} ${y0 + h * 0.06} ${cx + 12} ${y0 - 6} Z" fill="${hairF}"/>`
  const front: Record<string, string> = {
    none: '',
    buzz: `<g opacity=".9" clip-path="url(#${clipTo(above(0.4, 0.16))})">${headShape(1, 2)}</g>`,
    // a neat short cut, the hairline set back so more of the forehead shows
    crew: cap(0.4, 0, 0.12) + sideburnsTo(0.44, 12)
      + along(8, 8).map((x, i) => `<path d="M${x - 5} ${headTop(x) - 2} L${x + (i % 2 ? 2 : -1)} ${headTop(x) - 10} L${x + 5} ${headTop(x) - 2} Z" fill="${hairF}"/>`).join(''),
    // short, the hairline receding at the temples, a little lower in the middle
    // (the hair whole, then the bare scalp laid over it in the face's own
    // skin — above the brows — so nothing shows through at the rounded corners)
    receding: cap(0.4, 0, 0.2) + `<g clip-path="url(#${clipTo(`M${x0 + T} ${y0 + h * 0.22} L${x0 + T} ${y0 + h * 0.17} Q${x0 + 14} ${y0 + h * 0.04} ${cx - 11} ${y0 + h * 0.08} Q${cx} ${y0 + h * 0.14} ${cx + 11} ${y0 + h * 0.08} Q${x1 - 14} ${y0 + h * 0.04} ${x1 - T} ${y0 + h * 0.17} L${x1 - T} ${y0 + h * 0.22} Z`)})">`
      + `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${hb.r}" fill="url(#sk-${id})"/></g>`,
    short: cap(0.36) + sideburns
      // volume: the front swept up and over, rising above the crown
      + `<path d="M${x0 + 4} ${y0 + h * 0.2} Q${x0 + 2} ${y0 - 12} ${cx + 2} ${y0 - 13} Q${x1 + 2} ${y0 - 12} ${x1 - 2} ${y0 + h * 0.14} Q${cx + 10} ${y0 - 2} ${cx - 8} ${y0 + 2} Q${x0 + 12} ${y0 + 4} ${x0 + 4} ${y0 + h * 0.2} Z" fill="${hairF}"/>`
      + `<path d="M${x0 + 14} ${y0 - 2} Q${cx - 6} ${y0 - 12} ${cx + 16} ${y0 - 8}" fill="none" stroke="${shade(hairC, 1.25)}" stroke-width="3" stroke-linecap="round" opacity=".4"/>`
      + `<path d="M${cx - 22} ${y0 + h * 0.18} Q${cx - 4} ${y0 + h * 0.34} ${cx + 12} ${y0 + h * 0.16} Z" fill="${hairF}"/>`
      // the fringe in three locks, a parting between each
      + [[-26, 0.24], [-8, 0.3], [10, 0.25]].map(([dx, d]) => `<path d="M${cx + dx - 9} ${y0 + h * 0.14} Q${cx + dx - 2} ${y0 + h * (d + 0.02)} ${cx + dx + 4} ${y0 + h * (d + 0.04)} Q${cx + dx + 6} ${y0 + h * 0.18} ${cx + dx + 10} ${y0 + h * 0.13} Z" fill="${hairF}"/>`).join('')
      + strands([[cx - 18, y0 + h * 0.06, cx - 14, y0 + h * 0.22, cx - 18, y0 + h * 0.14], [cx + 2, y0 + h * 0.05, cx + 1, y0 + h * 0.24, cx + 4, y0 + h * 0.14]], hairDD, 1.8),
    side: cap(0.4) + sideburns
      // volume: the front swept up and over, rising above the crown
      + `<path d="M${x0 + 4} ${y0 + h * 0.2} Q${x0 + 2} ${y0 - 12} ${cx + 2} ${y0 - 13} Q${x1 + 2} ${y0 - 12} ${x1 - 2} ${y0 + h * 0.14} Q${cx + 10} ${y0 - 2} ${cx - 8} ${y0 + 2} Q${x0 + 12} ${y0 + 4} ${x0 + 4} ${y0 + h * 0.2} Z" fill="${hairF}"/>`
      + `<path d="M${x0 + 14} ${y0 - 2} Q${cx - 6} ${y0 - 12} ${cx + 16} ${y0 - 8}" fill="none" stroke="${shade(hairC, 1.25)}" stroke-width="3" stroke-linecap="round" opacity=".4"/>`
      + `<path d="M${x0 - 3} ${y0 + h * 0.4} Q${x0 + 4} ${y0 + h * 0.1} ${cx + 24} ${y0 + h * 0.12} Q${cx - 6} ${y0 + h * 0.2} ${x0 + 10} ${y0 + h * 0.42} Z" fill="${hairF}"/>`
      + `<path d="M${cx + 24} ${y0 + h * 0.12} Q${cx - 6} ${y0 + h * 0.2} ${x0 + 10} ${y0 + h * 0.42}" fill="none" stroke="${hairD}" stroke-width="3" stroke-linecap="round"/>`
      + strands([[cx + 16, y0 + h * 0.05, x0 + 8, y0 + h * 0.3, cx - 8, y0 + h * 0.1], [cx + 28, y0 + h * 0.03, cx - 2, y0 + h * 0.13, cx + 12, y0 + h * 0.06]], hairDD, 1.8),
    // curls along the curve of the head, down to the temples
    curly: cap(0.3, 2) + curls(9, 2, 12, -2, 5) + sideburnsTo(0.36),
    afro: [...Array(7)].map((_, i) => curl(x0 + 6 + i * (w - 12) / 6, y0 + 8, 11)).join(''),
    // a short, rounded afro: a little fuller than the head, its edge in small curls
    afroShort: cap(0.42, 4, 0.2) + curls(9, 6, 6, 6)
      // the hairline in small curls too, so it ends soft over the forehead
      + along(6, T + 8).map((x, i) => curl(x, y0 + h * 0.2 + (i % 2) * 2, 5.5)).join(''),
    // short and wavy: the fringe in soft waves
    wavyShort: cap(0.34, 1) + [...Array(5)].map((_, i) => curl(x0 + 10 + i * (w - 20) / 4, y0 + h * 0.2, 8 - Math.abs(i - 2))).join('') + sideburns,
    curlyLong: cap(0.4, 2) + curls(9, 2, 12, -2, 5),
    // locs: the top in ropes, with their ends hanging down the sides
    locs: (() => {
      const c = clipTo(above(0.36, 0.2))
      return `<g clip-path="url(#${c})">${headShape(5, 8)}`
        + along(7, 4).map(x => `<path d="M${x} ${headTop(x) - 4} L${x} ${y0 + h * 0.22}" stroke="${hairD}" stroke-width="2.4" stroke-linecap="round"/><path d="M${x + 3} ${headTop(x) - 1} L${x + 3} ${y0 + h * 0.12}" stroke="${hairL}" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>`).join('')
        + `</g>` + sideburnsTo(0.6, 10)
    })(),
    // cornrows: close to the head, in rows running back from the hairline
    cornrows: (() => {
      const c = clipTo(above(0.4, 0.14))
      return `<g clip-path="url(#${c})">${headShape(1, 2)}`
        + along(5, 10).map(x => `<path d="M${x} ${y0 + h * 0.15} L${x + (x - cx) * 0.15} ${headTop(x + (x - cx) * 0.15) + 2}" stroke="${hairD}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="3 2.4"/>`).join('')
        + `</g>`
    })(),
    bob: cap(0.5, 4) + `<rect x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h * 0.24}" rx="10" fill="${hairF}"/>`
      + [0.28, 0.5, 0.72].map(f => `<path d="M${x0 + w * f} ${y0 + h * 0.08} L${x0 + w * f + 1} ${y0 + h * 0.25}" stroke="${hairDD}" stroke-width="1.8" stroke-linecap="round" opacity=".45"/>`).join(''),
    long: cap(0.62, 4) + curtains,
    wavy: cap(0.62, 4) + curtains,
    ponytail: cap(0.32) + sweep + `<path d="M${x0} ${y0 + h * 0.3} Q${cx - 10} ${y0 + h * 0.1} ${x1 - 4} ${y0 + h * 0.22} Q${cx} ${y0 - 2} ${x0} ${y0 + h * 0.3} Z" fill="${hairD}" opacity=".5"/>`,
    pigtails: cap(0.34) + sweep + `<path d="M${cx} ${y0 - 4} L${cx} ${y0 + h * 0.2}" stroke="${hairD}" stroke-width="2.5"/>`,
    bun: cap(0.32) + sweep,
    braids: cap(0.36) + `<path d="M${cx} ${y0 - 4} L${cx} ${y0 + h * 0.2}" stroke="${hairD}" stroke-width="2.5"/>`
  }

  /* ---- ears and head ---- */
  const ears = `<rect x="${x0 - 9}" y="${ey - 8}" width="16" height="20" rx="8" fill="${skinD}"/><rect x="${x1 - 7}" y="${ey - 8}" width="16" height="20" rx="8" fill="${skinD}"/>`
    + `<path d="M${x0 - 3} ${ey - 3} Q${x0 - 6} ${ey + 3} ${x0 - 2} ${ey + 8}" fill="none" stroke="${skinDD}" stroke-width="2.4" stroke-linecap="round"/><path d="M${x1 + 3} ${ey - 3} Q${x1 + 6} ${ey + 3} ${x1 + 2} ${ey + 8}" fill="none" stroke="${skinDD}" stroke-width="2.4" stroke-linecap="round"/>`
  // earrings, at the lobes
  const GOLD = '#F2C230', GOLD_D = '#C99A18'
  const earrings: Record<string, string> = {
    none: '',
    studs: `<circle cx="${x0 - 1}" cy="${ey + 11}" r="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="1"/><circle cx="${x1 + 1}" cy="${ey + 11}" r="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="1"/>`,
    hoops: `<circle cx="${x0 - 1}" cy="${ey + 16}" r="5.5" fill="none" stroke="${GOLD}" stroke-width="2.4"/><circle cx="${x1 + 1}" cy="${ey + 16}" r="5.5" fill="none" stroke="${GOLD}" stroke-width="2.4"/>`
  }

  /* a scout's kit, over the shirt: a whistle or a compass on a lanyard, or
     badges sewn on (the troop's crest on the chest, a patch on the sleeve) */
  // a cord round the neck: it comes out from under the neckerchief on both
  // sides and meets at a ring in the middle of the chest, where it hangs
  const RX = 100, RY = 174
  const lanyard = `<path d="M83 152 Q84 170 ${RX - 2} ${RY - 1} M117 152 Q116 170 ${RX + 2} ${RY - 1}" fill="none" stroke="#2B2B33" stroke-width="2.2" stroke-linecap="round"/>`
    + `<circle cx="${RX}" cy="${RY}" r="2.8" fill="none" stroke="#94A1B2" stroke-width="1.6"/>`
  const gear: Record<string, string> = {
    none: '',
    // a metal whistle hanging from its ring, the mouthpiece down: a barrel,
    // the round chamber with its hole, the light along it
    whistle: lanyard + `<g transform="translate(${RX - 58.5} ${RY + 3 - 166}) rotate(72 58.5 166) translate(58.5 166) scale(.76) translate(-58.5 -166)">`
      + `<path d="M60 165 h17 a6.5 6.5 0 0 1 0 13 h-17 a6.5 6.5 0 0 1 0 -13 Z" fill="#B9C3CF"/>`
      + `<path d="M60 171.5 h17 a6.5 6.5 0 0 1 -6 6.5 h-11 a6.5 6.5 0 0 1 -6.5 -6.5 Z" fill="#94A1B2"/>`
      + `<rect x="76" y="166.5" width="11" height="8" rx="2.4" fill="#A9B4C2"/><rect x="76" y="171" width="11" height="3.5" rx="1.5" fill="#8593A6"/>`
      + `<circle cx="65" cy="171.5" r="3" fill="#6F7E92"/><path d="M61 167.4 h13" stroke="#EEF2F6" stroke-width="2" stroke-linecap="round"/>`
      + `<circle cx="58.5" cy="166" r="2.6" fill="none" stroke="#94A1B2" stroke-width="1.6"/></g>`,
    // a compass hanging from its bail: a brass case and bezel, a white dial
    // with its four marks, a red and navy needle
    compass: lanyard + `<g transform="translate(${RX - 129} ${RY + 11 - 169})"><circle cx="129" cy="169" r="11.5" fill="#C99A18"/><circle cx="129" cy="169" r="11.5" fill="none" stroke="#9C7410" stroke-width="1.4"/>`
      + `<circle cx="129" cy="169" r="8.6" fill="#FFFDF5"/><rect x="127" y="155.6" width="4" height="3.4" rx="1.2" fill="#C99A18"/>`
      + `<path d="M129 161.6 v2 M129 174.4 v2 M121.6 169 h2 M134.4 169 h2" stroke="#2B2B33" stroke-width="1.2" stroke-linecap="round"/>`
      + `<path d="M129 162.8 L131.4 169 L126.6 169 Z" fill="#D8343C"/><path d="M129 175.2 L131.4 169 L126.6 169 Z" fill="#1F2C6B"/><circle cx="129" cy="169" r="1.3" fill="#C99A18"/>`
      + `<path d="M122.5 164.5 Q125 161.8 128.5 161.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></g>`,
    // badges sewn on: the troop's crest on the chest, a stripe patch on the sleeve
    badges: `<circle cx="66" cy="166" r="9" fill="#1F2C6B"/>` + crest(66, 166, 7.4)
      + `<g transform="rotate(18 147 158)"><rect x="139" y="150" width="16" height="16" rx="3.5" fill="#1F2C6B" stroke="#F2C230" stroke-width="1.4"/>`
      + `<path d="M142 155 l5 4 l5 -4 M142 160 l5 4 l5 -4" fill="none" stroke="#F2C230" stroke-width="2" stroke-linejoin="round"/></g>`
  }
  // the flame pin (7 days): bronze, on the left pocket
  const pin = a.pin === 'flame'
    ? `<g transform="translate(67 181) scale(1.3) translate(-67 -181)"><circle cx="67" cy="181" r="7" fill="#C77B3A" stroke="#8E5524" stroke-width="1.6"/>`
      + `<path d="M67 175.5 C70.5 179 71 182 69.6 184.6 C68.8 186 65.2 186 64.4 184.6 C63.2 182.4 64.2 180.6 65.4 179.8 C65.6 181.2 66.2 181.8 66.8 182 C66.2 179.6 66.4 177.4 67 175.5 Z" fill="#FFB62E"/>`
      + `<path d="M67 180.5 C68.6 182.2 68.6 184 67 185 C65.4 184 65.6 182.4 67 180.5 Z" fill="#FFE58A"/></g>`
    // the Easter egg (seasonal): a red-dyed egg in a gold rim, on the same pocket
    : a.pin === 'egg'
    ? `<g transform="translate(67 181) scale(1.3) translate(-67 -181)"><ellipse cx="67" cy="181" rx="6.6" ry="8.2" fill="#F2C230" stroke="#C99A18" stroke-width="1.2"/>`
      + `<ellipse cx="67" cy="181.3" rx="5" ry="6.5" fill="#C8202E"/><ellipse cx="65.2" cy="178.4" rx="1.5" ry="2.4" fill="#fff" opacity=".55"/>`
      + `<path d="M62.6 183 Q67 185.4 71.4 183" fill="none" stroke="#8E1520" stroke-width="1" opacity=".6"/></g>`
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
  // the face: a soft light from the upper left, a warm glow on the cheeks
  const head = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${hb.r}" fill="url(#sk-${id})"/>`
    + `<ellipse cx="${eyeL - 6}" cy="${ey + 17}" rx="8" ry="4.5" fill="#F28B82" opacity=".3"/><ellipse cx="${eyeR + 6}" cy="${ey + 17}" rx="8" ry="4.5" fill="#F28B82" opacity=".3"/>`

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
    ? `<path d="M${x + s * 7} ${ey - 9} l${s * 5} -4 M${x + s * 9} ${ey - 5} l${s * 6} -2" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` : ''
  const eye = (x: number, s: number) => {
    const kind = xp.eyes === 'wink' ? (s > 0 ? 'happy' : 'open') : xp.eyes
    if (kind === 'happy') return `<path d="M${x - 8} ${ey + 2} Q${x} ${ey - 8} ${x + 8} ${ey + 2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    // the eye's shape: round (big and friendly), almond (longer, narrower), small
    const sh = a.eyeShape
    const ry = kind === 'wide' ? 12.5 : sh === 'almond' ? 7.6 : sh === 'small' ? 8 : 11.2
    const rx = kind === 'wide' ? 10.5 : sh === 'almond' ? 10 : sh === 'small' ? 7.4 : 10
    const ir = kind === 'wide' ? 7.8 : sh === 'round' ? 7.6 : 6
    const iy = ey + (sh === 'round' ? 1.5 : 0.8)
    const whites = `<ellipse cx="${x}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff"/>`
      + `<circle cx="${x + 1}" cy="${iy}" r="${ir}" fill="${iris}" stroke="${shade(iris, 0.6)}" stroke-width="1.2"/>`
      + `<circle cx="${x + 1}" cy="${iy}" r="${ir / 1.7}" fill="${INK}"/><circle cx="${x + 3}" cy="${ey - 1.5}" r="${ir / 3}" fill="#fff"/><circle cx="${x - 1.6}" cy="${iy + ir * 0.45}" r="${ir / 6}" fill="#fff" opacity=".85"/>`
    // the upper lid drawn as a soft dark line, as the concept has it
    const upper = `<path d="M${x - rx + 0.5} ${ey - 1} Q${x} ${ey - ry * 1.28} ${x + rx - 0.5} ${ey - 1}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`
    const lid = kind === 'half'
      ? `<path d="M${x - rx - 1} ${ey - 1} Q${x} ${ey - ry - 6} ${x + rx + 1} ${ey - 1} Z" fill="${skinD}"/><path d="M${x - rx} ${ey - 1} L${x + rx} ${ey - 1}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
      : ''
    return whites + (kind === 'half' ? '' : upper) + lid + lash(x, s)
  }
  const browC = a.hair === 'none' ? shade(skin, 0.55) : shade(hairC, 0.85)
  const brow = (x: number, s: number) => {
    const b = xp.brows, by = ey - 17
    const tilt = b === 'angry' ? s * 12 : b === 'tilt' ? (s > 0 ? -10 : 4) : b === 'soft' ? -s * 4 : 0
    const lift = b === 'up' ? -4 : 0
    const th = a.brows === 'thin' ? 2.6 : a.brows === 'thick' ? 6 : 4, bw = a.brows === 'thick' ? 20 : 17
    // a curved, tapering brow, thicker in the middle
    const yy = by + lift + 2
    return `<path d="M${x - bw / 2 + 1} ${yy + 1} Q${x} ${yy - 5} ${x + bw / 2 - 1} ${yy + 1}" fill="none" stroke="${browC}" stroke-width="${th}" stroke-linecap="round" transform="rotate(${tilt} ${x} ${yy})"/>`
  }
  const eyes = eye(eyeL, -1) + eye(eyeR, 1) + brow(eyeL, -1) + brow(eyeR, 1)
  const ny = ey + 14
  const NOSE: Record<string, string> = {
    button: `<path d="M${cx - 5} ${ny + 4} Q${cx} ${ny - 6} ${cx + 5} ${ny + 4} Q${cx} ${ny + 7} ${cx - 5} ${ny + 4} Z" fill="${skinDD}"/>`,
    round: `<ellipse cx="${cx}" cy="${ny + 2}" rx="6.5" ry="5.5" fill="${skinDD}"/>`,
    long: `<path d="M${cx - 2} ${ny - 11} Q${cx + 1} ${ny - 11} ${cx + 2} ${ny - 1} Q${cx + 8} ${ny + 4} ${cx + 1} ${ny + 6.5} Q${cx - 6} ${ny + 6.5} ${cx - 4.5} ${ny + 2} Q${cx - 2.5} ${ny - 2} ${cx - 2} ${ny - 11} Z" fill="${skinDD}"/>`,
    wide: `<path d="M${cx - 9} ${ny + 4} Q${cx - 6} ${ny - 5} ${cx} ${ny - 3} Q${cx + 6} ${ny - 5} ${cx + 9} ${ny + 4} Q${cx} ${ny + 8.5} ${cx - 9} ${ny + 4} Z" fill="${skinDD}"/>`
  }
  const nose = (NOSE[a.nose] || NOSE.button) + `<ellipse cx="${cx - 1.6}" cy="${ny - 0.5}" rx="1.8" ry="1.4" fill="#fff" opacity=".35"/>`
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
  // a glint across each lens
  const glare = `<path d="M${eyeL + 2} ${gy - 8} l6 -2 M${eyeR + 2} ${gy - 8} l6 -2" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`
  const arms = `<path d=""M${eyeL - 13} ${gy - 3} L${x0 - 2} ${gy - 6} M${eyeR + 13} ${gy - 3} L${x1 + 2} ${gy - 6}" stroke="${gc}" stroke-width="3.4" stroke-linecap="round"/>`
  const glasses: Record<string, string> = {
    none: '',
    round: `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="4"><circle cx="${eyeL}" cy="${gy}" r="13"/><circle cx="${eyeR}" cy="${gy}" r="13"/></g><path d="M${eyeL + 13} ${gy - 2} Q${cx} ${gy - 7} ${eyeR - 13} ${gy - 2}" fill="none" stroke="${gc}" stroke-width="3.4"/>` + arms + glare,
    square: `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="4"><rect x="${eyeL - 14}" y="${gy - 11}" width="28" height="22" rx="6"/><rect x="${eyeR - 14}" y="${gy - 11}" width="28" height="22" rx="6"/></g><path d="M${eyeL + 14} ${gy - 3} L${eyeR - 14} ${gy - 3}" stroke="${gc}" stroke-width="3.4"/>` + arms + glare,
    cateye: `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="4" stroke-linejoin="round"><path d="M${eyeL - 15} ${gy - 10} L${eyeL + 13} ${gy - 8} Q${eyeL + 13} ${gy + 11} ${eyeL} ${gy + 11} Q${eyeL - 13} ${gy + 11} ${eyeL - 15} ${gy - 10} Z"/><path d="M${eyeR + 15} ${gy - 10} L${eyeR - 13} ${gy - 8} Q${eyeR - 13} ${gy + 11} ${eyeR} ${gy + 11} Q${eyeR + 13} ${gy + 11} ${eyeR + 15} ${gy - 10} Z"/></g><path d="M${eyeL + 13} ${gy - 4} L${eyeR - 13} ${gy - 4}" stroke="${gc}" stroke-width="3.4"/>` + arms,
    sunglasses: `<path d="M${eyeL - 15} ${gy - 10} L${eyeL + 14} ${gy - 10} L${eyeL + 13} ${gy + 2} Q${eyeL + 11} ${gy + 12} ${eyeL} ${gy + 12} Q${eyeL - 12} ${gy + 12} ${eyeL - 14} ${gy + 2} Z M${eyeR + 15} ${gy - 10} L${eyeR - 14} ${gy - 10} L${eyeR - 13} ${gy + 2} Q${eyeR - 11} ${gy + 12} ${eyeR} ${gy + 12} Q${eyeR + 12} ${gy + 12} ${eyeR + 14} ${gy + 2} Z" fill="${INK}"/>`
      + `<path d="M${eyeL + 14} ${gy - 8} L${eyeR - 14} ${gy - 8}" stroke="${gc}" stroke-width="4"/><path d="M${eyeL - 15} ${gy - 10} L${eyeL + 14} ${gy - 10} M${eyeR - 14} ${gy - 10} L${eyeR + 15} ${gy - 10}" stroke="${gc}" stroke-width="4" stroke-linecap="round"/>`
      + `<path d="M${eyeL - 9} ${gy - 5} l7 0 M${eyeR - 9} ${gy - 5} l7 0" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>`
      + `<path d="M${eyeL - 16} ${gy - 11} L${eyeL + 15} ${gy - 11} M${eyeR - 15} ${gy - 11} L${eyeR + 16} ${gy - 11}" stroke="${gc}" stroke-width="5.5" stroke-linecap="round"/>`
      + `<path d="M${eyeL + 3} ${gy + 6} l5 -5 M${eyeR + 3} ${gy + 6} l5 -5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".35"/>` + arms
  }

  /* ---- headwear ---- */
  const hw = a.headwearColor, hwD = shade(hw, 0.78), hwL = shade(hw, 1.2)
  const top = y0 - 4
  // the troop's own logo, as the badge on every hat: the real thing, cut
  // round, with a navy rim and a glint
  const badge = (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r + 1.4}" fill="${CREST_NAVY}"/>`
    + `<image href="/images/logo-96.webp" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" clip-path="url(#${clipTo(`M${x - r} ${y} A${r} ${r} 0 1 0 ${x + r} ${y} A${r} ${r} 0 1 0 ${x - r} ${y} Z`)})"/>`
    + `<path d="M${x - r * 0.7} ${y - r * 0.35} A${r * 0.8} ${r * 0.8} 0 0 1 ${x - r * 0.1} ${y - r * 0.8}" fill="none" stroke="#fff" stroke-width="${Math.max(1, r * 0.16)}" stroke-linecap="round" opacity=".55"/>`
  /* the campaign hat: a wide brim, the crown rising to a rounded peak with
     its two dents in front, the band with the badge — in brown felt, or in
     gold for the 90-day reward */
  const campaign = (felt: string, feltD: string, feltDD: string, feltL: string, band: string, bandL: string) => {
    const R = w / 2 + 34
    return `<ellipse cx="${cx}" cy="${y0 + 12}" rx="${R}" ry="12" fill="${feltDD}"/><ellipse cx="${cx}" cy="${y0 + 9}" rx="${R}" ry="10" fill="${felt}"/>`
      + `<path d="M${cx - R + 6} ${y0 + 10} A${R - 6} 7 0 0 1 ${cx + R - 6} ${y0 + 10}" fill="none" stroke="${feltL}" stroke-width="2.2" opacity=".55"/>`
      + `<path d="M${cx - 33} ${y0 + 9} C${cx - 34} ${y0 - 14} ${cx - 24} ${y0 - 40} ${cx} ${y0 - 41} C${cx + 24} ${y0 - 40} ${cx + 34} ${y0 - 14} ${cx + 33} ${y0 + 9} Z" fill="${felt}"/>`
      + `<path d="M${cx + 6} ${y0 - 40.5} C${cx + 24} ${y0 - 39} ${cx + 34} ${y0 - 14} ${cx + 33} ${y0 + 9} L${cx + 19} ${y0 + 9} C${cx + 23} ${y0 - 12} ${cx + 19} ${y0 - 30} ${cx + 6} ${y0 - 40.5} Z" fill="${feltD}"/>`
      + [-1, 1].map(s => `<ellipse cx="${cx + s * 11}" cy="${y0 - 25}" rx="6.5" ry="10.5" fill="${feltDD}" opacity=".8" transform="rotate(${s * 14} ${cx + s * 11} ${y0 - 25})"/>`
        + `<path d="M${cx + s * 5} ${y0 - 18} Q${cx + s * 11} ${y0 - 12} ${cx + s * 16} ${y0 - 20}" fill="none" stroke="${feltL}" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>`).join('')
      + `<path d="M${cx - 22} ${y0 - 26} Q${cx - 18} ${y0 - 36} ${cx - 8} ${y0 - 39}" fill="none" stroke="${feltL}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`
      + `<path d="M${cx - 33.6} ${y0 - 4} Q${cx} ${y0 - 1} ${cx + 33.6} ${y0 - 4} L${cx + 33.4} ${y0 + 8} Q${cx} ${y0 + 11} ${cx - 33.4} ${y0 + 8} Z" fill="${band}"/>`
      + `<path d="M${cx - 32} ${y0 - 2.4} Q${cx} ${y0 + 0.6} ${cx + 32} ${y0 - 2.4}" fill="none" stroke="${bandL}" stroke-width="1.6" opacity=".7"/>`
  }
  // a sparkle, for the golden hat
  const sparkle = (x: number, y: number, r: number) => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z" fill="#FFF3B8"/>`
  const hwDD = shade(hw, 0.58)
  // the pompom sits on the crown, low enough to stay in the picture on a tall head
  const pom = Math.max(top - 28, 12)
  const beanieBody = `M${x0 - 4} ${y0 + 16} Q${x0 - 4} ${top - 26} ${cx} ${top - 26} Q${x1 + 4} ${top - 26} ${x1 + 4} ${y0 + 16} Z`
  const headwear: Record<string, string> = {
    none: '',
    scout: campaign('#94633A', '#7A4E2A', '#5E3B1F', '#B9875A', '#3E2614', '#6E4524') + badge(cx, y0 + 2, 8.5),
    // a beret: soft, pulled over to one side, a dark leather band, the
    // little stalk on top, the badge to the front
    beret: `<path d="M${x0 - 6} ${y0 + 12} Q${x0 - 16} ${top - 18} ${cx - 4} ${top - 22} Q${x1 + 22} ${top - 20} ${x1 + 6} ${y0 + 10} Z" fill="${hw}"/>`
      + `<path d="M${x1 + 6} ${y0 + 10} Q${x1 + 22} ${top - 20} ${cx + 10} ${top - 21} Q${x1 + 8} ${top - 10} ${x1 - 6} ${y0 + 8} Z" fill="${hwD}"/>`
      + `<path d="M${x0 - 2} ${y0 + 6} Q${cx} ${y0 + 1} ${x1 + 2} ${y0 + 6} L${x1 + 2} ${y0 + 14} Q${cx} ${y0 + 10} ${x0 - 2} ${y0 + 14} Z" fill="${shade(hw, 0.4)}"/>`
      + `<path d="M${x0 + 2} ${y0 + 7.5} Q${cx} ${y0 + 3} ${x1 - 2} ${y0 + 7.5}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".18"/>`
      + `<path d="M${cx - 10} ${top - 22} q-1 -8 4 -9 q5 1 3 9 Z" fill="${hwD}"/>`
      + `<path d="M${x0 + 4} ${top - 6} Q${cx - 14} ${top - 20} ${cx + 10} ${top - 20}" fill="none" stroke="${hwL}" stroke-width="3.2" stroke-linecap="round" opacity=".7"/>`
      + badge(x1 - 20, y0 - 8, 8.5),
    // a baseball cap: six panels with their seams, eyelets, the button on
    // top, a curved brim, the badge on the front panel
    cap: `<path d="M${x0 - 3} ${y0 + 16} Q${x0 - 4} ${top - 22} ${cx} ${top - 22} Q${x1 + 4} ${top - 22} ${x1 + 3} ${y0 + 16} Z" fill="${hw}"/>`
      + `<path d="M${x1 - 18} ${top - 18} Q${x1 + 4} ${top - 16} ${x1 + 3} ${y0 + 16} L${x1 - 10} ${y0 + 16} Q${x1 - 8} ${top - 4} ${x1 - 18} ${top - 18} Z" fill="${hwD}"/>`
      + `<path d="M${cx} ${top - 20} V${y0 + 12} M${cx - 4} ${top - 20} Q${x0 + 8} ${top - 10} ${x0 + 4} ${y0 + 14} M${cx + 4} ${top - 20} Q${x1 - 8} ${top - 10} ${x1 - 4} ${y0 + 14}" fill="none" stroke="${hwDD}" stroke-width="1.5" opacity=".55"/>`
      + `<circle cx="${cx - 20}" cy="${top - 9}" r="1.6" fill="${hwDD}" opacity=".7"/><circle cx="${cx + 20}" cy="${top - 9}" r="1.6" fill="${hwDD}" opacity=".7"/>`
      + `<path d="M${x0 - 8} ${y0 + 18} Q${cx} ${y0 + 6} ${x1 + 8} ${y0 + 18} Q${cx} ${y0 + 30} ${x0 - 8} ${y0 + 18} Z" fill="${hwD}"/>`
      + `<path d="M${x0 - 6} ${y0 + 19.5} Q${cx} ${y0 + 31} ${x1 + 6} ${y0 + 19.5}" fill="none" stroke="${hwDD}" stroke-width="2.6" stroke-linecap="round"/>`
      + `<path d="M${x0 + 2} ${y0 + 15} Q${cx} ${y0 + 8} ${x1 - 2} ${y0 + 15}" fill="none" stroke="${hwL}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>`
      + `<ellipse cx="${cx}" cy="${top - 21}" rx="5" ry="3.4" fill="${hwD}"/>`
      + `<path d="M${x0 + 8} ${y0 + 2} Q${x0 + 10} ${top - 12} ${cx - 14} ${top - 18}" fill="none" stroke="${hwL}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`
      + badge(cx, top - 3, 9),
    // a knitted beanie: ribbed all over, a deep folded cuff, a big fluffy
    // pompom, the badge on the cuff
    beanie: `<path d="${beanieBody}" fill="${hw}"/>`
      + `<g clip-path="url(#${clipTo(beanieBody)})">`
      + [...Array(16)].map((_, i) => `<rect x="${x0 - 4 + i * (w + 8) / 15 - 1.6}" y="${top - 30}" width="3.2" height="${y0 - top + 50}" fill="${hwD}" opacity=".5"/>`).join('')
      + `<path d="M${x0 - 4} ${top - 2} Q${cx - 18} ${top - 26} ${cx + 6} ${top - 24}" fill="none" stroke="${hwL}" stroke-width="4" stroke-linecap="round" opacity=".45"/></g>`
      + `<rect x="${x0 - 6}" y="${y0 + 1}" width="${w + 12}" height="19" rx="7" fill="${hwD}"/>`
      + [...Array(12)].map((_, i) => `<rect x="${x0 - 3 + i * (w + 6) / 11 - 1.3}" y="${y0 + 3.5}" width="2.6" height="14" rx="1.3" fill="${hwDD}" opacity=".45"/>`).join('')
      + `<path d="M${x0 - 3} ${y0 + 3.4} H${x1 + 3}" stroke="${hwL}" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>`
      + [[0, 0, 11], [-8, 3, 6.5], [8, 3, 6.5], [-6, -7, 6.5], [6, -7, 6.5], [0, -10, 6], [-10, -3, 5.5], [10, -3, 5.5]].map(([dx, dy, r]) =>
        `<circle cx="${cx + dx}" cy="${pom + dy}" r="${r}" fill="${hwL}"/>`).join('')
      + [[-5, -2], [4, -5], [6, 4], [-3, 6], [-9, 2], [1, -11]].map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${pom + dy}" r="1.7" fill="${hwD}" opacity=".5"/>`).join('')
      + `<circle cx="${cx - 5}" cy="${pom - 6}" r="3.4" fill="#fff" opacity=".35"/>`
      + badge(cx, y0 + 10.5, 7.6),
    // the golden campaign hat (90 days): gold felt, a red band, a red
    // feather, sparkles
    // the Santa hat (seasonal, Christmas): red, the tip flopping over to the
    // side with its pompom, a fluffy white trim with a sprig of holly
    santa: `<path d="M${x0 - 4} ${y0 + 10} Q${x0 - 2} ${top - 30} ${cx + 6} ${top - 30} Q${x1 + 18} ${top - 28} ${x1 + 22} ${y0 + 8} Q${x1 + 10} ${top - 12} ${x1 + 4} ${y0 + 10} Z" fill="#D12F3A"/>`
      + `<path d="M${cx + 6} ${top - 30} Q${x1 + 18} ${top - 28} ${x1 + 22} ${y0 + 8} Q${x1 + 12} ${top - 14} ${cx + 14} ${top - 22} Z" fill="#A5202B"/>`
      + `<path d="M${x0 + 6} ${top - 6} Q${x0 + 12} ${top - 24} ${cx - 2} ${top - 26}" fill="none" stroke="#F06A72" stroke-width="3.4" stroke-linecap="round" opacity=".7"/>`
      + `<rect x="${x0 - 7}" y="${y0 + 3}" width="${w + 14}" height="15" rx="7.5" fill="#F7F4EE"/>`
      + [...Array(9)].map((_, i) => `<circle cx="${x0 - 3 + i * (w + 6) / 8}" cy="${y0 + 4 + (i % 2) * 1.5}" r="4.2" fill="#fff"/>`).join('')
      + `<rect x="${x0 - 5}" y="${y0 + 13}" width="${w + 10}" height="4" rx="2" fill="#DCD6CC" opacity=".7"/>`
      + `<circle cx="${x1 + 21}" cy="${y0 + 12}" r="8.5" fill="#fff"/><circle cx="${x1 + 18.5}" cy="${y0 + 9.5}" r="3" fill="#F7F4EE"/>`
      + `<path d="M${x0 + 10} ${y0 + 8} q4 -5 9 -2 q-4 1 -5 5 Z M${x0 + 10} ${y0 + 8} q-1 -6 -6 -6 q2 3 1 7 Z" fill="#2E7D4A"/>`
      + `<circle cx="${x0 + 12}" cy="${y0 + 9.5}" r="2" fill="#D12F3A"/><circle cx="${x0 + 9}" cy="${y0 + 10.5}" r="2" fill="#D12F3A"/>`,
    // the straw hat (seasonal, summer camp): woven straw, a wide brim, a blue
    // band with the badge
    straw: (() => {
      const R = w / 2 + 30
      return `<ellipse cx="${cx}" cy="${y0 + 12}" rx="${R}" ry="11" fill="#C9A24E"/><ellipse cx="${cx}" cy="${y0 + 9}" rx="${R}" ry="9.5" fill="#EBCB7A"/>`
        + [...Array(5)].map((_, i) => `<ellipse cx="${cx}" cy="${y0 + 9}" rx="${R - 6 - i * 7}" ry="${8 - i * 1.2}" fill="none" stroke="#C9A24E" stroke-width="1" opacity=".55"/>`).join('')
        + `<path d="M${cx - 31} ${y0 + 8} C${cx - 32} ${y0 - 14} ${cx - 22} ${y0 - 32} ${cx} ${y0 - 33} C${cx + 22} ${y0 - 32} ${cx + 32} ${y0 - 14} ${cx + 31} ${y0 + 8} Z" fill="#EBCB7A"/>`
        + `<path d="M${cx + 8} ${y0 - 32.5} C${cx + 24} ${y0 - 30} ${cx + 32} ${y0 - 14} ${cx + 31} ${y0 + 8} L${cx + 18} ${y0 + 8} C${cx + 22} ${y0 - 10} ${cx + 18} ${y0 - 26} ${cx + 8} ${y0 - 32.5} Z" fill="#D9B45E"/>`
        + [-20, -10, 0, 10, 20].map(dx => `<path d="M${cx + dx} ${y0 - 30 + Math.abs(dx) * 0.12} Q${cx + dx * 1.15} ${y0 - 12} ${cx + dx * 1.25} ${y0 + 2}" fill="none" stroke="#C9A24E" stroke-width="1.1" opacity=".6"/>`).join('')
        + `<path d="M${cx - 31.6} ${y0 - 5} Q${cx} ${y0 - 2} ${cx + 31.6} ${y0 - 5} L${cx + 31.3} ${y0 + 5} Q${cx} ${y0 + 8} ${cx - 31.3} ${y0 + 5} Z" fill="#2E5E8C"/>`
        + `<path d="M${cx - 22} ${y0 - 22} Q${cx - 16} ${y0 - 30} ${cx - 6} ${y0 - 31}" fill="none" stroke="#FFF1C4" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`
        + badge(cx, y0, 7)
    })(),
    golden: campaign('#F2C230', '#DDAA22', '#B98A12', '#FFF3B8', '#C8303A', '#E86A6A')
      + `<path d="M${cx + 25} ${y0 - 1} C${cx + 30} ${y0 - 20} ${cx + 42} ${y0 - 36} ${cx + 52} ${y0 - 42} C${cx + 50} ${y0 - 24} ${cx + 42} ${y0 - 8} ${cx + 30} ${y0 + 1} Z" fill="#D8343C"/>`
      + `<path d="M${cx + 28} ${y0 - 1} C${cx + 35} ${y0 - 18} ${cx + 43} ${y0 - 30} ${cx + 50} ${y0 - 39}" fill="none" stroke="#8E1A22" stroke-width="1.3"/>`
      + [[-12, 0.3], [-20, 0.45], [-28, 0.6]].map(([dy, k]) => `<path d="M${cx + 33 + k * 10} ${y0 + dy} l6 -4" stroke="#8E1A22" stroke-width="1" opacity=".6"/>`).join('')
      + sparkle(cx - 46, y0 - 18, 5) + sparkle(cx + 54, y0 - 2, 4) + sparkle(cx - 28, y0 - 40, 3.4)
      + badge(cx, y0 + 2, 8.5)
  }

  // a birthday: a striped party hat, tilted, with a pompom — for the day only
  const partyHat = (() => {
    const bx = cx + 8, by = y0 + 8, tx = cx + 16, ty = Math.max(top - 26, 4)
    const cone = `M${bx - 20} ${by} L${tx} ${ty} L${bx + 18} ${by - 2} Z`
    return `<g clip-path="url(#${clipTo(cone)})"><path d="${cone}" fill="#4E8FD6"/>`
      + [0, 1, 2, 3].map(i => `<path d="M${bx - 26} ${by - 4 - i * 10} L${bx + 26} ${by - 14 - i * 10} L${bx + 26} ${by - 9.5 - i * 10} L${bx - 26} ${by + 0.5 - i * 10} Z" fill="${['#F5D547', '#E7643C', '#F5D547', '#E7643C'][i]}"/>`).join('')
      + `</g><path d="M${bx - 20} ${by} Q${bx} ${by + 4} ${bx + 18} ${by - 2}" fill="none" stroke="#2E5E8C" stroke-width="3" stroke-linecap="round"/>`
      + [[-7, -4], [0, -7], [7, -4], [-5, 3], [5, 3], [0, 0]].map(([dx, dy]) => `<circle cx="${tx + dx * 0.75}" cy="${ty + dy * 0.75}" r="3.8" fill="${dx === 0 && dy === 0 ? '#fff' : '#E35D9A'}"/>`).join('')
  })()

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
  const coversTop = ['scout', 'beret', 'cap', 'beanie', 'golden', 'santa', 'straw'].includes(a.headwear)
  // a shine on hair that covers the crown, unless a hat is over it
  // (only where the hair is smooth and reaches over the crown: on a
  // receding hairline it would fall on the scalp)
  const SHINY = ['short', 'side', 'wavyShort', 'bob', 'long', 'wavy', 'ponytail', 'pigtails', 'bun', 'braids']
  const shine = !coversTop && SHINY.includes(a.hair)
    ? `<path d="M${x0 + 12} ${y0 + 6} Q${cx - 14} ${y0 - 5} ${cx + 6} ${y0 - 3}" fill="none" stroke="${shade(hairC, 1.25)}" stroke-width="3.4" stroke-linecap="round" opacity=".4"/>`
    : ''
  const hairFront = (coversTop ? `<g clip-path="url(#under-${id})">${front[a.hair] || ''}</g>` : (front[a.hair] || '')) + shine
  const hairBack = coversTop && a.hair === 'bun' ? '' : (back[a.hair] || '')
  const hatTop = a.headwear === 'scout' || a.headwear === 'golden' || a.headwear === 'straw' ? y0 + 6 : y0 + 14

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW[crop]}">`
    + `<defs>`
    + `<pattern id="st-${id}" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(-35)"><rect width="9" height="9" fill="${SCARF_BLUE}"/><rect width="4" height="9" fill="${SCARF_YELLOW}"/></pattern>`
    + `<clipPath id="under-${id}"><rect x="0" y="${hatTop}" width="200" height="200"/></clipPath>`
    + `<clipPath id="chin-${id}"><rect x="${x0 - 1}" y="${y0}" width="${w + 2}" height="${h + 10}" rx="${hb.r}"/></clipPath>`
    + extraDefs.join('') + sceneDefs
    + `<radialGradient id="sk-${id}" cx=".4" cy=".34" r=".75"><stop offset="0" stop-color="${shade(skin, 1.07)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, 0.93)}"/></radialGradient>`
    + `<linearGradient id="hg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hairC, 1.12)}"/><stop offset=".55" stop-color="${hairC}"/><stop offset="1" stop-color="${shade(hairC, 0.92)}"/></linearGradient>`
    + `<clipPath id="face-${id}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${hb.r}"/></clipPath>`
    + `</defs>`
    // standing, they stand on the page itself: no backdrop of their own
    + (standing ? '' : `<rect x="-40" y="-40" width="280" height="280" fill="${a.bg}"/>` + scenes[a.scene] + aura)
    + hairBack + lowerBody + clothes[a.clothes] + standArms + scarfBack + neck + scarfFront + gear[a.gear] + pin + patch + cord
    + ears + head + earrings[a.earrings] + extras[a.extras] + eyes + nose + facialHair[a.facialHair] + (MOUTH[xp.mouth] || '')
    + hairFront + glasses[a.glasses] + (opts.party ? partyHat : headwear[a.headwear]) + companion
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
