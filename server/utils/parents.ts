import { useDb, schema as s } from '../db'
import { sectionOfWith } from './guard'

type Parent = typeof s.parents.$inferSelect

/** The section a parent belongs to.

   A parent is reached through their child, so the child's section is what
   counts — it follows the kid automatically when they move up. Parents added
   before the link existed have no child, and fall back to the section they
   were filed under. */
export function sectionOfParent(
  p: Parent,
  scouts: Array<typeof s.scouts.$inferSelect>,
  patrols: Array<typeof s.patrols.$inferSelect>
): number | null {
  if (p.scoutId == null) return p.sectionId
  const kid = scouts.find(x => x.id === p.scoutId)
  return kid ? sectionOfWith(kid as any, patrols) : p.sectionId
}

/** Parents of the given scouts — who to tell when their kids are involved. */
export async function parentsOfScouts(scoutIds: number[]): Promise<Parent[]> {
  if (!scoutIds.length) return []
  const db = await useDb()
  const ids = new Set(scoutIds)
  return (await db.select().from(s.parents))
    .filter(p => p.isActive && p.scoutId != null && ids.has(p.scoutId))
}
