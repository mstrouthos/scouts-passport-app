import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/** Points awarded automatically when a meeting is reviewed. Absence can be
    negative (a penalty) — the leader decides. Each section may set its own;
    the troop's values are the default for a section that has not. */
export type PointRules = {
  present: number
  excused: number      // justified absence
  absent: number
  uniformFull: number
  uniformPartial: number
  uniformNone: number     // may be negative — a penalty for turning up out of uniform
}

export const DEFAULT_POINTS: PointRules = {
  present: 5, excused: 0, absent: 0,
  uniformFull: 5, uniformPartial: 0, uniformNone: 0
}

const FIELDS = ['present', 'excused', 'absent', 'uniformFull', 'uniformPartial', 'uniformNone'] as const
/* The troop's values are "points.<field>"; a section's own are
   "points.s<id>.<field>". A section without its own uses the troop's. */
const keyFor = (field: string, sectionId: number | null) =>
  sectionId == null ? `points.${field}` : `points.s${sectionId}.${field}`

async function pointRows() {
  const db = (await useDb())
  return (await db.select().from(s.settings)).filter(r => r.key.startsWith('points.'))
}

/** The rules for a section — its own where it has set them, else the troop's,
    else the built-in defaults. Without a section: the troop's. */
export async function getPointRules(sectionId: number | null = null): Promise<PointRules> {
  const rows = await pointRows()
  const num = (k: string) => {
    const v = rows.find(r => r.key === k)?.value
    const n = v == null ? NaN : Number(v)
    return Number.isFinite(n) ? n : null
  }
  const out = {} as PointRules
  for (const f of FIELDS)
    out[f] = (sectionId != null ? num(keyFor(f, sectionId)) : null) ?? num(keyFor(f, null)) ?? DEFAULT_POINTS[f]
  return out
}

/** Has this section set rules of its own? */
export async function hasOwnPointRules(sectionId: number): Promise<boolean> {
  return (await pointRows()).some(r => r.key.startsWith(`points.s${sectionId}.`))
}

/** Back to the troop's rules. */
export async function clearPointRules(sectionId: number) {
  const db = (await useDb())
  for (const f of FIELDS) await db.delete(s.settings).where(eq(s.settings.key, keyFor(f, sectionId)))
}

export async function setPointRules(next: Partial<PointRules>, sectionId: number | null = null) {
  const db = (await useDb())
  for (const field of FIELDS) {
    const key = keyFor(field, sectionId)
    const v = next[field]
    if (v === undefined) continue
    const n = Math.trunc(Number(v))
    if (!Number.isFinite(n) || Math.abs(n) > 1000)
      throw createError({ statusCode: 400, message: `Bad value for ${field}` })
    await db.insert(s.settings).values({ key, value: String(n) })
      .onConflictDoUpdate({ target: s.settings.key, set: { value: String(n) } })
  }
}

/* How a section ranks its units (ενωμοτίες, εξάδες, όμιλοι): by the sum of
   their members' points, or by the average per member — which does not
   reward a unit simply for being bigger. Each section's leaders choose. Until
   they do, each keeps what it always had: the Αγέλη and Μικρή Αγέλη sum, the
   others average. */
export type TeamScoring = 'sum' | 'average'
const SUM_BY_DEFAULT = new Set(['ageli', 'mikri-ageli'])

export async function getTeamScoring(sectionId: number | null): Promise<TeamScoring> {
  if (sectionId == null) return 'average'
  const db = (await useDb())
  const v = (await db.select().from(s.settings).where(eq(s.settings.key, `teamScoring.s${sectionId}`)))[0]?.value
  if (v === 'sum' || v === 'average') return v
  const sec = (await db.select().from(s.sections).where(eq(s.sections.id, sectionId)))[0]
  return sec && SUM_BY_DEFAULT.has(sec.slug) ? 'sum' : 'average'
}

export async function setTeamScoring(sectionId: number, mode: TeamScoring) {
  const db = (await useDb())
  const key = `teamScoring.s${sectionId}`
  await db.insert(s.settings).values({ key, value: mode })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: mode } })
}

/** A unit's score under its section's rule. */
export const teamScore = (sum: number, members: number, mode: TeamScoring) =>
  mode === 'sum' ? sum : members ? Math.round(sum / members) : 0
