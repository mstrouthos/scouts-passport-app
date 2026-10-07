/* Finding the member a parent meant from the name they typed — on a form
   sent by plain link, where there is no app to say whose family it is.
   Greek or Latin letters ("Νίκος Παπαδόπουλος", "Nikos Papadopoulos"),
   accents or none, surname first or last, a letter or two out: all are
   brought to one plain spelling and compared word by word. A date of birth,
   when the form asks for one, settles near-ties. Only a clear, single match
   is taken; anything less is left for a leader, with suggestions. */

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
  let t = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  for (const [re, to] of PAIRS) t = t.replace(re, to)
  t = t.replace(/[α-ω]/g, c => LETTERS[c] ?? c)
  // Latin as Greeks write it: ou/oi/ei/ai, y for υ/η, ch/kh/x for χ, w for ω
  t = t.replace(/ou/g, 'u').replace(/oi|ei/g, 'i').replace(/ai/g, 'e').replace(/y/g, 'i')
    .replace(/ch|kh/g, 'h').replace(/w/g, 'o').replace(/ph/g, 'f').replace(/x/g, 'ks')
  return t.replace(/[^a-z\s]/g, ' ').replace(/(.)\1+/g, '$1').replace(/\s+/g, ' ').trim()
}

function lev(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = cur
    }
  }
  return d[b.length]
}
const like = (a: string, b: string) => !a || !b ? 0 : 1 - lev(a, b) / Math.max(a.length, b.length)

export type Candidate = { id: number, firstName: string, lastName: string, firstNameEn?: string | null, lastNameEn?: string | null, birthday?: string | null }

/** How well a typed name fits a member, 0–1: both their names must be found
    among the words typed (in any order), each about as well as spelled. */
export function nameScore(typed: string, c: Candidate, dob?: string | null) {
  const words = plainName(typed).split(' ').filter(Boolean)
  if (!words.length) return 0
  const fit = (first: string, last: string) => {
    const f = plainName(first).split(' ').filter(Boolean), l = plainName(last).split(' ').filter(Boolean)
    if (!f.length || !l.length) return 0
    const best = (w: string) => Math.max(...words.map(x => like(x, w)))
    // every part of the surname, and the first of the first names
    const sur = l.reduce((n, w) => n + best(w), 0) / l.length
    return (best(f[0]) + sur) / 2
  }
  let s = Math.max(fit(c.firstName, c.lastName), c.firstNameEn && c.lastNameEn ? fit(c.firstNameEn, c.lastNameEn) : 0)
  // the date of birth, when both are known: the same is near proof, another tells against
  if (dob && c.birthday && /^\d{4}-\d{2}-\d{2}$/.test(dob)) s += dob === c.birthday.slice(0, 10) ? 0.15 : -0.25
  return Math.max(0, Math.min(1, s))
}

/** The members a typed name may be, best first. */
export function suggestions(typed: string, pool: Candidate[], dob?: string | null, min = 0.55) {
  return pool.map(c => ({ c, score: nameScore(typed, c, dob) })).filter(x => x.score >= min).sort((a, b) => b.score - a.score)
}

/** The one member a typed name clearly is — or null, for a leader to decide. */
export function clearMatch(typed: string, pool: Candidate[], dob?: string | null): number | null {
  const [a, b] = suggestions(typed, pool, dob)
  if (!a || a.score < 0.82) return null
  if (b && a.score - b.score < 0.1) return null
  return a.c.id
}
