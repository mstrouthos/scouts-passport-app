import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const id = idParam(event)
  const db = (await useDb())
  const g = (await db.select().from(s.notifyGroups).where(eq(s.notifyGroups.id, id)).limit(1))[0]
  if (!g) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && (g.sectionId == null || !secIds.includes(g.sectionId)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  // past announcements keep their history; just unlink them from the group
  await db.update(s.announcements).set({ groupId: null }).where(eq(s.announcements.groupId, id))
  await db.delete(s.notifyGroupMembers).where(eq(s.notifyGroupMembers.groupId, id))
  await db.delete(s.notifyGroupLeaders).where(eq(s.notifyGroupLeaders.groupId, id))
  await db.delete(s.notifyGroups).where(eq(s.notifyGroups.id, id))
  return { ok: true }
})
