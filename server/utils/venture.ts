import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { rankOf, sectionOfWith, type SessionScout } from './guard'
import { VENTURE_AWARDS, VENTURE_MILESTONES, VENTURE_LOGS } from '../db/ventureData'

const parse = (v: string | null) => { try { return v ? JSON.parse(v) : null } catch { return null } }

/** Signing off is the Α.Κ.Α.'s job, the same rule as the Ομάδα's passport. */
export async function assertCanSign(me: SessionScout) {
  const rank = await rankOf(me)
  if (rank === 'yparchigos')
    throw createError({ statusCode: 403, message: 'Μόνο ο Αρχηγός μπορεί να απονείμει απαιτήσεις' })
}

/** Is this scout in the Κοινότητα? The programme applies to nobody else. */
export async function isVenture(scoutId: number): Promise<boolean> {
  const db = await useDb()
  const kid = (await db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).limit(1))[0]
  if (!kid) return false
  const sec = sectionOfWith(kid as any, await db.select().from(s.patrols))
  const row = (await db.select().from(s.sections)).find(x => x.id === sec)
  return row?.slug === 'koinotita'
}

/** The whole booklet for one Ανιχνευτής. */
export async function ventureFor(scoutId: number) {
  const db = await useDb()
  const reqs = (await db.select().from(s.ventureRequirements)).sort((a, b) => a.sortOrder - b.sortOrder)
  const mine = await db.select().from(s.ventureAwards).where(eq(s.ventureAwards.scoutId, scoutId))
  const done = new Map(mine.map(a => [a.requirementId, a]))
  const stones = await db.select().from(s.ventureMilestones).where(eq(s.ventureMilestones.scoutId, scoutId))
  const logs = (await db.select().from(s.ventureLogs).where(eq(s.ventureLogs.scoutId, scoutId)))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))

  const awards = VENTURE_AWARDS.map(a => {
    const items = reqs.filter(r => r.award === a.slug).map(r => {
      const got = done.get(r.id)
      return {
        id: r.id, code: r.code, areaEl: r.areaEl, textEl: r.textEl,
        bulletsEl: parse(r.bulletsEl), optionsEl: parse(r.optionsEl),
        needsNote: r.needsNote, groupKey: r.groupKey, groupMin: r.groupMin,
        completedOn: got?.completedOn ?? null,
        chosenEl: got?.chosenEl ?? null, noteEl: got?.noteEl ?? null
      }
    })
    // a "choose 2 of 5" set counts as met once enough of it is signed off,
    // so the rest of the set does not read as outstanding
    const groups = new Map<string, { min: number, done: number, total: number }>()
    for (const it of items) {
      if (!it.groupKey) continue
      const g = groups.get(it.groupKey) || { min: it.groupMin ?? 1, done: 0, total: 0 }
      g.total++; if (it.completedOn) g.done++
      groups.set(it.groupKey, g)
    }
    const required = items.filter(i => !i.groupKey).length
      + [...groups.values()].reduce((n, g) => n + g.min, 0)
    const earned = items.filter(i => !i.groupKey && i.completedOn).length
      + [...groups.values()].reduce((n, g) => n + Math.min(g.done, g.min), 0)
    return {
      ...a, items,
      groups: [...groups.entries()].map(([key, g]) => ({ key, ...g })),
      earned, total: required, complete: required > 0 && earned >= required,
      milestones: VENTURE_MILESTONES.filter(m => m.award === a.slug).map(m => ({
        ...m, onDate: stones.find(x => x.key === m.key)?.onDate ?? null
      }))
    }
  })

  return {
    awards,
    logs: VENTURE_LOGS.map(l => ({ ...l, entries: logs.filter(x => x.kind === l.kind) })),
    earned: awards.reduce((n, a) => n + a.earned, 0),
    total: awards.reduce((n, a) => n + a.total, 0)
  }
}
