import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = useDb()
  const patrol = db.select().from(s.patrols).where(eq(s.patrols.id, id)).get()
  if (!patrol) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(patrol.sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const hasMembers = db.select().from(s.scouts).all().some(r => r.patrolId === id)
  if (hasMembers) throw createError({ statusCode: 400, message: 'Move its members to another team first' })
  db.delete(s.leaderScopes).where(eq(s.leaderScopes.patrolId, id)).run()
  try {
    db.delete(s.patrols).where(eq(s.patrols.id, id)).run()
  } catch {
    throw createError({ statusCode: 400, message: 'This team has past events or challenges tied to it and cannot be deleted' })
  }
  return { ok: true }
})
