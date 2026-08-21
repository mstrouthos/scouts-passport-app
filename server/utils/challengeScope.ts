import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { scopedSectionIds, type SessionScout } from './guard'

/** Load a challenge and assert the leader may manage it. Mirrors the rule in
    challenges.post.ts: full access sees everything, a sector leader only their
    own section's challenges. */
export async function challengeInScope(me: SessionScout, id: number) {
  const db = (await useDb())
  const c = (await db.select().from(s.challenges).where(eq(s.challenges.id, id)).limit(1))[0]
  if (!c) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && (c.sectionId == null || !secIds.includes(c.sectionId)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  return c
}
