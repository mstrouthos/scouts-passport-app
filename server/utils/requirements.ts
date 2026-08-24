import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { rankOf, scopedSectionIds, type SessionScout } from './guard'
import { STAGES, HONOURS, BADGE_CATEGORIES } from '../db/passportData'

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
  return {
    stages, earned, total, currentStage: stages[currentIdx]?.slug ?? null,
    honours: await honoursFor(scoutId, stages)
  }
}

/** Οι Δάφνες and the Πτυχίο Εξειδίκευσης, worked out rather than ticked: each
    asks for a stage and a set of Πτυχία, all of which the app already knows.
    Shown as progress so a scout can see exactly what is still missing. */
export async function honoursFor(scoutId: number, stages: any[]) {
  const db = await useDb()
  const held = await db.select().from(s.scoutAchievements).where(eq(s.scoutAchievements.scoutId, scoutId))
  const badges = await db.select().from(s.achievements)
  const byId = new Map(badges.map(b => [b.id, b]))
  const mine = held.map(h => byId.get(h.achievementId)).filter(Boolean) as any[]
  const catName = (slug: string) => BADGE_CATEGORIES.find(c => c.slug === slug)?.titleEl ?? slug

  const done = new Set<string>()
  return HONOURS.map(h => {
    const parts: Array<{ labelEl: string, have: number, need: number }> = []
    if (h.needsStage) {
      const st = stages.find(x => x.slug === h.needsStage)
      parts.push({ labelEl: st?.ofEl ?? String(h.needsStage), have: st?.complete ? 1 : 0, need: 1 })
    }
    if (h.needsHonour)
      parts.push({ labelEl: HONOURS.find(x => x.slug === h.needsHonour)?.titleEl ?? h.needsHonour,
                   have: done.has(h.needsHonour) ? 1 : 0, need: 1 })
    for (const pc of h.perCategory ?? [])
      parts.push({ labelEl: catName(pc.category),
                   have: mine.filter(b => b.category === pc.category).length, need: pc.count })
    for (const slug of h.namedBadges ?? []) {
      const b = badges.find(x => x.slug === slug)
      parts.push({ labelEl: b?.titleEl ?? slug, have: mine.some(x => x.slug === slug) ? 1 : 0, need: 1 })
    }
    const complete = parts.every(p => p.have >= p.need)
    if (complete) done.add(h.slug)
    return {
      slug: h.slug, titleEl: h.titleEl, emoji: h.emoji, colour: h.colour,
      parts, complete,
      have: parts.reduce((n, p) => n + Math.min(p.have, p.need), 0),
      need: parts.reduce((n, p) => n + p.need, 0)
    }
  })
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
