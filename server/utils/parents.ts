import { useDb, schema as s } from '../db'
import { sectionOfWith } from './guard'

type Parent = typeof s.parents.$inferSelect

/** Every child of a parent: the join table, plus the original single-child
    column for families added before that table existed. */
export function childIdsOfParent(
  p: Parent,
  links: Array<typeof s.parentChildren.$inferSelect>
): number[] {
  const ids = new Set(links.filter(l => l.parentId === p.id).map(l => l.scoutId))
  if (p.scoutId != null) ids.add(p.scoutId)
  return [...ids]
}

/** Every section a parent belongs to.

   A parent is reached through their children, so their children's sections are
   what count — they follow the kids automatically as they move up. A family
   with a Λυκόπουλο and a Πρόσκοπος belongs to both, and must be visible to
   both sets of Βαθμοφόροι. Parents with no child at all fall back to the
   section they were filed under. */
export function sectionsOfParent(
  p: Parent,
  links: Array<typeof s.parentChildren.$inferSelect>,
  scouts: Array<typeof s.scouts.$inferSelect>,
  patrols: Array<typeof s.patrols.$inferSelect>
): number[] {
  const ids = childIdsOfParent(p, links)
    .map(cid => scouts.find(x => x.id === cid))
    .filter(Boolean)
    .map(kid => sectionOfWith(kid as any, patrols))
    .filter(x => x != null) as number[]
  const out = [...new Set(ids)]
  if (!out.length && p.sectionId != null) out.push(p.sectionId)
  return out
}

/** The first of those, for the places that still show a single sector. */
export function sectionOfParent(
  p: Parent,
  links: Array<typeof s.parentChildren.$inferSelect>,
  scouts: Array<typeof s.scouts.$inferSelect>,
  patrols: Array<typeof s.patrols.$inferSelect>
): number | null {
  return sectionsOfParent(p, links, scouts, patrols)[0] ?? null
}

/** Parents of the given scouts — who to tell when their kids are involved. */
export async function parentsOfScouts(scoutIds: number[]): Promise<Parent[]> {
  if (!scoutIds.length) return []
  const db = await useDb()
  const ids = new Set(scoutIds)
  const links = await db.select().from(s.parentChildren)
  return (await db.select().from(s.parents))
    .filter(p => p.isActive && childIdsOfParent(p, links).some(cid => ids.has(cid)))
}
