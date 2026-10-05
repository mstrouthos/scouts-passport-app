/* A member's avatar, built from a few choices and drawn as a flat cartoon
   SVG: skin, face shape, hair and its colour, eyes, mouth, glasses or other
   face wear, a hat (the scout hat among them), the shirt, and — on everyone,
   always — the troop's scarf with its woggle. The same function draws it in
   the creator and wherever the member appears. */

export const AVATAR_OPTIONS = {
  gender: ['boy', 'girl'],
  skin: ['#FDE3CF', '#F6CBA5', '#E9B48A', '#D29A6C', '#A86F48', '#7A4B2E'],
  face: ['round', 'oval', 'square'],
  hair: ['short', 'spiky', 'curly', 'side', 'buzz', 'long', 'ponytail', 'bun', 'braids', 'bob', 'afro', 'none'],
  hairColor: ['#2B2120', '#4A3125', '#7B4A2A', '#C58A3E', '#E8C36A', '#B5502A', '#9AA0A6'],
  eyes: ['dots', 'happy', 'wide', 'wink'],
  mouth: ['smile', 'grin', 'open', 'calm'],
  facewear: ['none', 'round', 'square', 'sunglasses', 'freckles', 'blush'],
  hat: ['none', 'scout', 'beret', 'cap', 'beanie', 'bandana'],
  shirt: ['#C9B48A', '#2E5E8C', '#3B6452', '#8E3B46', '#5B4A8B'],
  bg: ['#D9E8FD', '#DDF2E7', '#FCF0D2', '#FBE3E6', '#E8E1F7', '#E3EBF4']
} as const

export type Avatar = {
  gender: 'boy' | 'girl'
  skin: string, face: string, hair: string, hairColor: string
  eyes: string, mouth: string, facewear: string, hat: string, shirt: string, bg: string
}
type K = keyof typeof AVATAR_OPTIONS

export const DEFAULT_AVATAR: Avatar = {
  gender: 'boy', skin: AVATAR_OPTIONS.skin[1], face: 'round', hair: 'short', hairColor: AVATAR_OPTIONS.hairColor[1],
  eyes: 'dots', mouth: 'smile', facewear: 'none', hat: 'none', shirt: AVATAR_OPTIONS.shirt[0], bg: AVATAR_OPTIONS.bg[0]
}

/** Only known choices survive; anything else falls back to the default. */
export function normalizeAvatar(raw: any): Avatar {
  const out: any = { ...DEFAULT_AVATAR }
  for (const k of Object.keys(AVATAR_OPTIONS) as K[]) {
    const v = raw?.[k]
    if ((AVATAR_OPTIONS[k] as readonly string[]).includes(v)) out[k] = v
  }
  return out
}

export function randomAvatar(): Avatar {
  const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
  const gender = pick(AVATAR_OPTIONS.gender)
  const hair = gender === 'girl' ? pick(['long', 'ponytail', 'bun', 'braids', 'bob', 'curly', 'afro'])
    : pick(['short', 'spiky', 'curly', 'side', 'buzz', 'afro'])
  return normalizeAvatar({
    gender, hair, skin: pick(AVATAR_OPTIONS.skin), face: pick(AVATAR_OPTIONS.face), hairColor: pick(AVATAR_OPTIONS.hairColor.slice(0, 6)),
    eyes: pick(['dots', 'happy', 'wide']), mouth: pick(['smile', 'grin', 'open']),
    facewear: Math.random() < 0.3 ? pick(['round', 'square', 'freckles', 'blush']) : 'none',
    hat: Math.random() < 0.35 ? pick(['scout', 'beret', 'cap', 'beanie']) : 'none',
    shirt: pick(AVATAR_OPTIONS.shirt), bg: pick(AVATAR_OPTIONS.bg)
  })
}

/* a colour a little darker, for shading and outlines */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c).map(v => v.toString(16).padStart(2, '0')).join('')
}

const INK = '#2A2330'
/* the troop's colours, from the crest */
const SCARF = '#F2C230', SCARF_EDGE = '#1F2C6B', WOGGLE = '#8A5A33'

/** The SVG, as markup. `id` keeps its clip path apart from another avatar's
    on the same page. */
export function avatarSvg(a0: Partial<Avatar> | null | undefined, id = 'a'): string {
  const a = normalizeAvatar(a0 || {})
  const skin = a.skin, skinD = shade(skin, 0.86), hairC = a.hairColor, hairD = shade(hairC, 0.78)
  const cx = 100
  // the head: its outline and the line where hair meets forehead
  const head = a.face === 'oval'
    ? `<ellipse cx="100" cy="94" rx="37" ry="45" fill="${skin}"/>`
    : a.face === 'square'
      ? `<rect x="61" y="50" width="78" height="88" rx="26" fill="${skin}"/>`
      : `<circle cx="100" cy="95" r="42" fill="${skin}"/>`
  const top = a.face === 'oval' ? 49 : a.face === 'square' ? 50 : 53
  const halfW = a.face === 'oval' ? 37 : a.face === 'square' ? 39 : 42

  /* hair behind the head (long styles) */
  const back: Record<string, string> = {
    long: `<path d="M${cx - halfW - 7} 90 Q${cx - halfW - 10} 140 ${cx - halfW - 2} 158 Q${cx - halfW + 10} 166 ${cx - halfW + 14} 150 L${cx + halfW - 14} 150 Q${cx + halfW - 10} 166 ${cx + halfW + 2} 158 Q${cx + halfW + 10} 140 ${cx + halfW + 7} 90 Z" fill="${hairD}"/>`,
    braids: `<path d="M${cx - halfW - 2} 100 q-8 30 -2 62" stroke="${hairD}" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M${cx + halfW + 2} 100 q8 30 2 62" stroke="${hairD}" stroke-width="13" stroke-linecap="round" fill="none"/>`
      + [0, 1, 2].map(i => `<path d="M${cx - halfW - 9} ${118 + i * 14} h13 M${cx + halfW - 4} ${118 + i * 14} h13" stroke="${shade(hairC, 0.6)}" stroke-width="2"/>`).join(''),
    ponytail: `<path d="M${cx + halfW - 6} 70 q30 8 22 54 q-4 18 -14 22 q4 -30 -14 -54 Z" fill="${hairD}"/>`,
    bob: `<path d="M${cx - halfW - 7} 86 Q${cx - halfW - 8} 132 ${cx - halfW + 4} 136 L${cx + halfW - 4} 136 Q${cx + halfW + 8} 132 ${cx + halfW + 7} 86 Z" fill="${hairD}"/>`,
    afro: `<circle cx="100" cy="84" r="${halfW + 20}" fill="${hairC}"/>`,
    bun: `<circle cx="100" cy="${top - 10}" r="15" fill="${hairC}"/><circle cx="100" cy="${top - 10}" r="15" fill="none" stroke="${hairD}" stroke-width="2"/>`
  }

  /* hair over the forehead */
  const T = top, L = cx - halfW, R = cx + halfW
  const front: Record<string, string> = {
    short: `<path d="M${L - 2} ${T + 34} Q${L - 4} ${T - 8} ${cx} ${T - 6} Q${R + 4} ${T - 8} ${R + 2} ${T + 34} Q${R - 6} ${T + 12} ${cx + 10} ${T + 14} Q${cx - 16} ${T + 20} ${L + 4} ${T + 26} Z" fill="${hairC}"/>`,
    spiky: `<path d="M${L - 2} ${T + 32} L${L + 2} ${T + 2} L${L + 12} ${T + 8} L${L + 18} ${T - 12} L${cx - 8} ${T + 2} L${cx} ${T - 16} L${cx + 10} ${T} L${R - 16} ${T - 12} L${R - 10} ${T + 6} L${R + 2} ${T} L${R + 2} ${T + 32} Q${R - 8} ${T + 14} ${cx} ${T + 16} Q${L + 8} ${T + 14} ${L - 2} ${T + 32} Z" fill="${hairC}"/>`,
    curly: [[-34, 18], [-26, 4], [-14, -4], [0, -7], [14, -4], [26, 4], [34, 18], [-20, 14], [-6, 10], [8, 10], [22, 14]]
      .map(([dx, dy]) => `<circle cx="${cx + dx * halfW / 42}" cy="${T + dy}" r="11.5" fill="${hairC}"/>`).join('')
      + `<path d="M${L - 3} ${T + 34} Q${L - 4} ${T + 18} ${L + 6} ${T + 14} L${L + 6} ${T + 30} Z M${R + 3} ${T + 34} Q${R + 4} ${T + 18} ${R - 6} ${T + 14} L${R - 6} ${T + 30} Z" fill="${hairC}"/>`,
    side: `<path d="M${L - 2} ${T + 36} Q${L - 6} ${T - 6} ${cx + 6} ${T - 6} Q${R + 6} ${T - 4} ${R + 2} ${T + 34} Q${R - 2} ${T + 14} ${R - 12} ${T + 10} Q${cx - 4} ${T + 4} ${cx - 18} ${T + 22} Q${L + 6} ${T + 18} ${L - 2} ${T + 36} Z" fill="${hairC}"/><path d="M${cx - 18} ${T + 22} Q${cx - 4} ${T + 4} ${R - 12} ${T + 10}" stroke="${hairD}" stroke-width="2" fill="none"/>`,
    buzz: `<path d="M${L + 1} ${T + 26} Q${L} ${T - 2} ${cx} ${T - 3} Q${R} ${T - 2} ${R - 1} ${T + 26} Q${cx} ${T + 12} ${L + 1} ${T + 26} Z" fill="${hairC}" opacity=".85"/>`,
    long: `<path d="M${L - 4} ${T + 52} Q${L - 8} ${T - 8} ${cx} ${T - 7} Q${R + 8} ${T - 8} ${R + 4} ${T + 52} Q${R - 2} ${T + 20} ${cx + 4} ${T + 12} Q${cx - 4} ${T + 22} ${cx - 22} ${T + 18} Q${L + 2} ${T + 22} ${L - 4} ${T + 52} Z" fill="${hairC}"/>`,
    ponytail: `<path d="M${L - 2} ${T + 30} Q${L - 4} ${T - 8} ${cx} ${T - 7} Q${R + 4} ${T - 8} ${R + 2} ${T + 30} Q${R - 8} ${T + 10} ${cx} ${T + 12} Q${L + 8} ${T + 10} ${L - 2} ${T + 30} Z" fill="${hairC}"/>`,
    bun: `<path d="M${L - 2} ${T + 30} Q${L - 4} ${T - 8} ${cx} ${T - 7} Q${R + 4} ${T - 8} ${R + 2} ${T + 30} Q${R - 8} ${T + 10} ${cx} ${T + 12} Q${L + 8} ${T + 10} ${L - 2} ${T + 30} Z" fill="${hairC}"/>`,
    braids: `<path d="M${L - 2} ${T + 36} Q${L - 4} ${T - 8} ${cx} ${T - 7} Q${R + 4} ${T - 8} ${R + 2} ${T + 36} Q${R - 6} ${T + 12} ${cx + 2} ${T + 12} L${cx} ${T + 2} L${cx - 2} ${T + 12} Q${L + 6} ${T + 12} ${L - 2} ${T + 36} Z" fill="${hairC}"/>`,
    bob: `<path d="M${L - 6} ${T + 46} Q${L - 8} ${T - 8} ${cx} ${T - 7} Q${R + 8} ${T - 8} ${R + 6} ${T + 46} Q${R - 2} ${T + 16} ${cx} ${T + 18} Q${L + 2} ${T + 16} ${L - 6} ${T + 46} Z" fill="${hairC}"/>`,
    afro: `<path d="M${L - 2} ${T + 28} Q${cx} ${T + 4} ${R + 2} ${T + 28} L${R + 2} ${T + 8} L${L - 2} ${T + 8} Z" fill="${hairC}"/>`,
    none: ''
  }

  const ears = `<circle cx="${L + 1}" cy="98" r="8" fill="${skinD}"/><circle cx="${R - 1}" cy="98" r="8" fill="${skinD}"/>`

  /* eyes, brows and lashes */
  const ey = 96, ex1 = 85, ex2 = 115
  const lash = a.gender === 'girl' ? (x: number, d: number) => `<path d="M${x + 4 * d} ${ey - 5} l${4 * d} -3" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` : () => ''
  const eye = (x: number, d: number, kind: string) =>
    kind === 'happy' || (kind === 'wink' && d > 0)
      ? `<path d="M${x - 6} ${ey + 1} Q${x} ${ey - 6} ${x + 6} ${ey + 1}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : kind === 'wide'
        ? `<ellipse cx="${x}" cy="${ey}" rx="7" ry="8" fill="#fff"/><circle cx="${x + 1}" cy="${ey + 1}" r="4.4" fill="${INK}"/><circle cx="${x + 2.6}" cy="${ey - 1}" r="1.5" fill="#fff"/>` + lash(x, d)
        : `<ellipse cx="${x}" cy="${ey}" rx="4.6" ry="5.6" fill="${INK}"/><circle cx="${x + 1.6}" cy="${ey - 1.8}" r="1.5" fill="#fff"/>` + lash(x, d)
  const brows = `<path d="M${ex1 - 8} ${ey - 13} Q${ex1} ${ey - 17} ${ex1 + 7} ${ey - 13}" stroke="${shade(hairC, 0.85)}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${ex2 - 7} ${ey - 13} Q${ex2} ${ey - 17} ${ex2 + 8} ${ey - 13}" stroke="${shade(hairC, 0.85)}" stroke-width="3" fill="none" stroke-linecap="round"/>`
  const eyes = eye(ex1, -1, a.eyes) + eye(ex2, 1, a.eyes) + brows

  const nose = `<path d="M98 104 Q101 110 97 112" stroke="${shade(skin, 0.7)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  const my = 120
  const mouths: Record<string, string> = {
    smile: `<path d="M88 ${my} Q100 ${my + 10} 112 ${my}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    grin: `<path d="M86 ${my - 2} Q100 ${my + 16} 114 ${my - 2} Z" fill="${INK}"/><path d="M89 ${my} Q100 ${my + 4} 111 ${my} L110 ${my - 1} L90 ${my - 1} Z" fill="#fff"/>`,
    open: `<ellipse cx="100" cy="${my + 3}" rx="7" ry="6" fill="${INK}"/><ellipse cx="100" cy="${my + 6}" rx="4" ry="2.4" fill="#E2777A"/>`,
    calm: `<path d="M91 ${my + 2} Q100 ${my + 5} 109 ${my + 2}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
  }

  const wear: Record<string, string> = {
    none: '',
    round: `<g fill="none" stroke="${INK}" stroke-width="3"><circle cx="${ex1}" cy="${ey}" r="11"/><circle cx="${ex2}" cy="${ey}" r="11"/><path d="M${ex1 + 11} ${ey - 1} Q100 ${ey - 5} ${ex2 - 11} ${ey - 1}"/><path d="M${ex1 - 11} ${ey - 2} L${L + 2} ${ey - 5}"/><path d="M${ex2 + 11} ${ey - 2} L${R - 2} ${ey - 5}"/></g>`,
    square: `<g fill="none" stroke="${INK}" stroke-width="3"><rect x="${ex1 - 12}" y="${ey - 9}" width="24" height="18" rx="5"/><rect x="${ex2 - 12}" y="${ey - 9}" width="24" height="18" rx="5"/><path d="M${ex1 + 12} ${ey - 2} L${ex2 - 12} ${ey - 2}"/><path d="M${ex1 - 12} ${ey - 3} L${L + 2} ${ey - 6}"/><path d="M${ex2 + 12} ${ey - 3} L${R - 2} ${ey - 6}"/></g>`,
    sunglasses: `<g><path d="M${ex1 - 13} ${ey - 8} h26 v6 q0 10 -13 10 q-13 0 -13 -10 Z M${ex2 - 13} ${ey - 8} h26 v6 q0 10 -13 10 q-13 0 -13 -10 Z" fill="${INK}"/><path d="M${ex1 + 13} ${ey - 6} L${ex2 - 13} ${ey - 6} M${ex1 - 13} ${ey - 7} L${L + 2} ${ey - 9} M${ex2 + 13} ${ey - 7} L${R - 2} ${ey - 9}" stroke="${INK}" stroke-width="3"/><path d="M${ex1 - 8} ${ey - 5} l6 0" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/></g>`,
    freckles: [[-22, 110], [-16, 113], [-24, 116], [22, 110], [16, 113], [24, 116]].map(([dx, y]) => `<circle cx="${100 + dx}" cy="${y}" r="1.6" fill="${shade(skin, 0.62)}"/>`).join(''),
    blush: `<ellipse cx="${ex1 - 6}" cy="112" rx="8" ry="4.5" fill="#F28B8B" opacity=".45"/><ellipse cx="${ex2 + 6}" cy="112" rx="8" ry="4.5" fill="#F28B8B" opacity=".45"/>`
  }

  /* hats, sitting on the top of the head */
  const hy = T + 6
  const hats: Record<string, string> = {
    none: '',
    // the campaign hat: wide flat brim, tall crown pinched into four dents, a band
    scout: `<g><ellipse cx="100" cy="${hy + 2}" rx="${halfW + 30}" ry="11" fill="#B08A52"/><ellipse cx="100" cy="${hy}" rx="${halfW + 30}" ry="9" fill="#C9A267"/>`
      + `<path d="M${cx - 32} ${hy} L${cx - 26} ${hy - 34} Q${cx - 14} ${hy - 44} ${cx - 6} ${hy - 36} L${cx} ${hy - 46} L${cx + 6} ${hy - 36} Q${cx + 14} ${hy - 44} ${cx + 26} ${hy - 34} L${cx + 32} ${hy} Z" fill="#C9A267"/>`
      + `<path d="M${cx} ${hy - 46} L${cx} ${hy - 12} M${cx - 26} ${hy - 34} L${cx - 18} ${hy - 12} M${cx + 26} ${hy - 34} L${cx + 18} ${hy - 12}" stroke="#A9834A" stroke-width="2" fill="none"/>`
      + `<path d="M${cx - 31} ${hy - 8} L${cx + 31} ${hy - 8} L${cx + 32} ${hy} L${cx - 32} ${hy} Z" fill="#5A3B22"/></g>`,
    beret: `<g><ellipse cx="${cx - 6}" cy="${hy - 8}" rx="${halfW + 8}" ry="16" fill="#7A1F2B"/><path d="M${L - 2} ${hy + 2} Q${cx} ${hy - 8} ${R + 2} ${hy + 2}" stroke="#4E141C" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="${cx + 16}" cy="${hy - 10}" r="5" fill="${SCARF}"/></g>`,
    cap: `<g><path d="M${L - 2} ${hy + 4} Q${L - 2} ${hy - 34} ${cx} ${hy - 34} Q${R + 2} ${hy - 34} ${R + 2} ${hy + 4} Z" fill="#2E5E8C"/><path d="M${cx - 4} ${hy + 4} Q${R + 30} ${hy - 2} ${R + 36} ${hy + 10} Q${R + 6} ${hy + 12} ${cx - 4} ${hy + 8} Z" fill="#244B70"/><circle cx="${cx}" cy="${hy - 33}" r="3.5" fill="#244B70"/></g>`,
    beanie: `<g><path d="M${L - 2} ${hy + 4} Q${L - 4} ${hy - 38} ${cx} ${hy - 38} Q${R + 4} ${hy - 38} ${R + 2} ${hy + 4} Z" fill="#3B6452"/><rect x="${L - 4}" y="${hy - 6}" width="${2 * halfW + 8}" height="14" rx="7" fill="#2D4E40"/><circle cx="${cx}" cy="${hy - 40}" r="8" fill="${SCARF}"/></g>`,
    bandana: `<g><path d="M${L - 1} ${hy + 10} Q${L} ${hy - 22} ${cx} ${hy - 24} Q${R} ${hy - 22} ${R + 1} ${hy + 10} Q${cx} ${hy + 2} ${L - 1} ${hy + 10} Z" fill="#C8463D"/><path d="M${R} ${hy + 4} l14 6 l-10 10 Z" fill="#A9382F"/><circle cx="${cx - 12}" cy="${hy - 8}" r="2" fill="#fff"/><circle cx="${cx + 8}" cy="${hy - 14}" r="2" fill="#fff"/><circle cx="${cx + 18}" cy="${hy - 4}" r="2" fill="#fff"/></g>`
  }
  // a hat hides hair that would poke through its crown
  const hairFront = a.hat !== 'none' && !['long', 'bob', 'braids', 'afro'].includes(a.hair) ? (front[a.hair] ? `<g clip-path="url(#below-${id})">${front[a.hair]}</g>` : '') : (front[a.hair] || '')

  /* shoulders, the shirt, and the troop scarf with its woggle */
  const shirt = a.shirt, shirtD = shade(shirt, 0.85)
  const body = `<path d="M28 200 Q30 158 70 148 L130 148 Q170 158 172 200 Z" fill="${shirt}"/>`
    + `<path d="M88 132 h24 v20 q-12 8 -24 0 Z" fill="${skinD}"/>`
    + `<path d="M66 150 Q100 166 134 150 L138 158 Q100 176 62 158 Z" fill="${SCARF}" stroke="${SCARF_EDGE}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M82 160 L100 200 L118 160 Q100 168 82 160 Z" fill="${SCARF}" stroke="${SCARF_EDGE}" stroke-width="3" stroke-linejoin="round"/>`
    + `<rect x="92" y="160" width="16" height="13" rx="5" fill="${WOGGLE}"/><path d="M95 163.5 h10 M95 169 h10" stroke="${shade(WOGGLE, 0.7)}" stroke-width="1.6"/>`
    + `<path d="M46 200 L52 176" stroke="${shirtD}" stroke-width="3"/><path d="M154 200 L148 176" stroke="${shirtD}" stroke-width="3"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">`
    + `<defs><clipPath id="c-${id}"><circle cx="100" cy="100" r="100"/></clipPath>`
    + `<clipPath id="below-${id}"><rect x="0" y="${hy - 2}" width="200" height="200"/></clipPath></defs>`
    + `<g clip-path="url(#c-${id})"><rect width="200" height="200" fill="${a.bg}"/>`
    // the figure drawn a little larger than its sketch, so the face fills the
    // circle and the scarf still shows at the bottom
    + `<g transform="translate(-12 -14) scale(1.12)">`
    + body + (back[a.hair] || '') + ears + head + eyes + nose + (mouths[a.mouth] || '') + (wear[a.facewear] || '')
    + hairFront + (hats[a.hat] || '')
    + `</g></g></svg>`
}
