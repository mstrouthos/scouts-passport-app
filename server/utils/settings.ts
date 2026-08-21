import { inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/** Points awarded automatically when a meeting is reviewed. Absence can be
    negative (a penalty) — the leader decides. */
export type PointRules = {
  present: number
  excused: number      // justified absence
  absent: number
  uniformFull: number
}

export const DEFAULT_POINTS: PointRules = { present: 5, excused: 0, absent: 0, uniformFull: 5 }

const KEYS = ['points.present', 'points.excused', 'points.absent', 'points.uniformFull'] as const

export async function getPointRules(): Promise<PointRules> {
  const db = (await useDb())
  const rows = await db.select().from(s.settings).where(inArray(s.settings.key, KEYS as unknown as string[]))
  const read = (k: string, fallback: number) => {
    const v = rows.find(r => r.key === k)?.value
    const n = v == null ? NaN : Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return {
    present: read('points.present', DEFAULT_POINTS.present),
    excused: read('points.excused', DEFAULT_POINTS.excused),
    absent: read('points.absent', DEFAULT_POINTS.absent),
    uniformFull: read('points.uniformFull', DEFAULT_POINTS.uniformFull)
  }
}

export async function setPointRules(next: Partial<PointRules>) {
  const db = (await useDb())
  for (const [field, key] of [
    ['present', 'points.present'], ['excused', 'points.excused'],
    ['absent', 'points.absent'], ['uniformFull', 'points.uniformFull']
  ] as const) {
    const v = next[field]
    if (v === undefined) continue
    const n = Math.trunc(Number(v))
    if (!Number.isFinite(n) || Math.abs(n) > 1000)
      throw createError({ statusCode: 400, message: `Bad value for ${field}` })
    await db.insert(s.settings).values({ key, value: String(n) })
      .onConflictDoUpdate({ target: s.settings.key, set: { value: String(n) } })
  }
}
