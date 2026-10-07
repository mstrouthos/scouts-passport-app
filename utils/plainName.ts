/* A name in one plain Latin spelling, the same whichever way it was written —
   Greek or Latin letters, accents or none. Used to match a typed name to a
   member (server/utils/nameMatch.ts) and to search for one in a list. */

const PAIRS: Array<[RegExp, string]> = [
  [/ου/g, 'u'], [/αι/g, 'e'], [/ει/g, 'i'], [/οι/g, 'i'], [/υι/g, 'i'],
  [/μπ/g, 'b'], [/ντ/g, 'd'], [/γκ/g, 'g'], [/γγ/g, 'g'], [/τσ/g, 'ts'], [/τζ/g, 'tz']
]
const LETTERS: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'ks',
  ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'i', φ: 'f', χ: 'h', ψ: 'ps', ω: 'o'
}

/** One plain Latin spelling of a name, the same whichever way it was written. */
export function plainName(s: string): string {
  let t = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  for (const [re, to] of PAIRS) t = t.replace(re, to)
  t = t.replace(/[α-ω]/g, c => LETTERS[c] ?? c)
  // Latin as Greeks write it: ou/oi/ei/ai, y for υ/η, ch/kh/x for χ, w for ω
  t = t.replace(/ou/g, 'u').replace(/oi|ei/g, 'i').replace(/ai/g, 'e').replace(/y/g, 'i')
    .replace(/ch|kh/g, 'h').replace(/w/g, 'o').replace(/ph/g, 'f').replace(/x/g, 'ks')
  return t.replace(/[^a-z\s]/g, ' ').replace(/(.)\1+/g, '$1').replace(/\s+/g, ' ').trim()
}
