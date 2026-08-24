import { eq, inArray, notInArray } from 'drizzle-orm'
import * as s from './schema'
import { REQUIREMENTS, BADGES } from './passportData'
import { VENTURE_REQUIREMENTS } from './ventureData'

/** Load the Προσκοπικό Διαβατήριο catalogue into the database.

   Runs on every boot and is idempotent: rows are matched by their printed
   number (requirements) or slug (πτυχία) and updated in place, so correcting
   a typo in the source data reaches an existing troop without touching the
   sign-offs that point at it. Badges from before this catalogue existed are
   archived rather than deleted — scouts may already have been awarded them. */
export async function seedPassport(db: any) {
  await seedVenture(db)
  const existing = await db.select().from(s.scoutRequirements)
  const byN = new Map(existing.map((r: any) => [r.n, r]))
  for (const r of REQUIREMENTS) {
    const row: any = byN.get(r.n)
    const vals = { stage: r.stage, themeEl: r.themeEl, textEl: r.textEl, meansEl: r.meansEl, level: r.level }
    if (!row) await db.insert(s.scoutRequirements).values({ n: r.n, ...vals })
    else await db.update(s.scoutRequirements).set(vals).where(eq(s.scoutRequirements.id, row.id))
  }

  const badges = await db.select().from(s.achievements)
  const bySlug = new Map(badges.filter((b: any) => b.slug).map((b: any) => [b.slug, b]))
  let order = 0
  for (const b of BADGES) {
    const vals = {
      titleEl: b.titleEl, iconEmoji: b.emoji, category: b.category,
      sortOrder: order++, isArchived: false
    }
    let id: number
    const row: any = bySlug.get(b.slug)
    if (!row) id = (await db.insert(s.achievements).values({ slug: b.slug, ...vals }).returning())[0].id
    else { id = row.id; await db.update(s.achievements).set(vals).where(eq(s.achievements.id, row.id)) }

    await db.delete(s.achievementRequirements).where(eq(s.achievementRequirements.achievementId, id))
    if (b.requirementsEl.length)
      await db.insert(s.achievementRequirements).values(
        b.requirementsEl.map((textEl, idx) => ({ achievementId: id, idx, textEl })))
  }

  // Anything without a catalogue slug predates the passport import.
  const slugs = BADGES.map(b => b.slug)
  await db.update(s.achievements).set({ isArchived: true })
    .where(notInArray(s.achievements.slug, slugs))
  await db.update(s.achievements).set({ isArchived: true })
    .where(inArray(s.achievements.id,
      badges.filter((b: any) => !b.slug).map((b: any) => b.id).length
        ? badges.filter((b: any) => !b.slug).map((b: any) => b.id) : [-1]))
}


/** The Κοινότητα Ανιχνευτών programme, matched by award + code so edits reach
    an existing troop without disturbing what has already been signed off. */
async function seedVenture(db: any) {
  const existing = await db.select().from(s.ventureRequirements)
  const byKey = new Map(existing.map((r: any) => [`${r.award}:${r.code}`, r]))
  let order = 0
  for (const r of VENTURE_REQUIREMENTS) {
    const vals = {
      areaEl: r.areaEl, textEl: r.textEl,
      bulletsEl: r.bulletsEl ? JSON.stringify(r.bulletsEl) : null,
      optionsEl: r.optionsEl ? JSON.stringify(r.optionsEl) : null,
      needsNote: !!r.needsNote,
      groupKey: r.groupKey ?? null, groupMin: r.groupMin ?? null,
      sortOrder: order++
    }
    const row: any = byKey.get(`${r.award}:${r.code}`)
    if (!row) await db.insert(s.ventureRequirements).values({ award: r.award, code: r.code, ...vals })
    else await db.update(s.ventureRequirements).set(vals).where(eq(s.ventureRequirements.id, row.id))
  }
}
