import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { rankOf, scopedSectionIds, type SessionScout } from './guard'
import { STAGES } from '../db/passportData'

/** Signing off a requirement is the Αρχηγός's job — in the passport it is his
    signature next to the date. Υπαρχηγοί may look, not award. */
export async function assertCanAward(me: SessionScout) {
  const rank = await rankOf(me)
  if (rank === 'yparchigos')
    throw createError({ statusCode: 403, message: 'Μόνο ο Αρχηγός μπορεί να απονείμει απαιτήσεις' })
  return rank
}

/** The whole passport for one scout: every requirement, grouped by stage, with
    the date it was signed off. A stage counts as earned once all of its
    requirements are in. */
export async function passportFor(scoutId: number) {
  const db = await useDb()
  const reqs = (await db.select().from(s.scoutRequirements)).sort((a, b) => a.n - b.n)
  const mine = await db.select().from(s.requirementAwards)
    .where(eq(s.requirementAwards.scoutId, scoutId))
  const done = new Map(mine.map(a => [a.requirementId, a]))

  const stages = STAGES.map(st => {
    const items = reqs.filter(r => r.stage === st.slug).map(r => {
      const a = done.get(r.id)
      return {
        id: r.id, n: r.n, themeEl: r.themeEl, textEl: r.textEl,
        meansEl: r.meansEl, level: r.level,
        completedOn: a?.completedOn ?? null
      }
    })
    const earned = items.filter(i => i.completedOn).length
    return {
      ...st, items, earned, total: items.length,
      complete: items.length > 0 && earned === items.length
    }
  })
  const earned = stages.reduce((n, st) => n + st.earned, 0)
  const total = stages.reduce((n, st) => n + st.total, 0)
  // the level a scout is on is the first stage they have not finished
  const currentIdx = Math.min(stages.findIndex(st => !st.complete) === -1
    ? stages.length - 1 : stages.findIndex(st => !st.complete), stages.length - 1)
  return { stages, earned, total, currentStage: stages[currentIdx]?.slug ?? null }
}

/** A leader may only touch scouts in their own sectors. */
export async function assertScoutVisible(me: SessionScout, scoutId: number) {
  const db = await useDb()
  const kid = (await db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).limit(1))[0]
  if (!kid) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return kid
  const patrols = await db.select().from(s.patrols)
  const sec = kid.sectionId ?? patrols.find(p => p.id === kid.patrolId)?.sectionId ?? null
  if (sec == null || !secIds.includes(sec))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  return kid
}

export async function awardRequirement(scoutId: number, requirementId: number, by: number, on: string) {
  const db = await useDb()
  const existing = (await db.select().from(s.requirementAwards)
    .where(and(eq(s.requirementAwards.scoutId, scoutId), eq(s.requirementAwards.requirementId, requirementId))).limit(1))[0]
  if (existing) {
    await db.update(s.requirementAwards).set({ completedOn: on, awardedBy: by })
      .where(eq(s.requirementAwards.id, existing.id))
  } else {
    await db.insert(s.requirementAwards).values({
      scoutId, requirementId, completedOn: on, awardedBy: by, createdAt: new Date().toISOString()
    })
  }
}

export async function revokeRequirement(scoutId: number, requirementId: number) {
  const db = await useDb()
  await db.delete(s.requirementAwards)
    .where(and(eq(s.requirementAwards.scoutId, scoutId), eq(s.requirementAwards.requirementId, requirementId)))
}
