import { and, eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'

/** What was put in my backpack has been shown to me. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const ids = ((await readBody<{ ids?: number[] }>(event))?.ids || []).map(Number).filter(Number.isInteger)
  if (ids.length) {
    const db = await useDb()
    await db.update(s.funGrants).set({ seen: true }).where(and(eq(s.funGrants.scoutId, me.id), inArray(s.funGrants.id, ids)))
  }
  return { ok: true }
})
