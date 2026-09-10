import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'
import { parentInScope } from './[id].patch'
import { assertCan } from '../../../utils/permissions'

/** Remove a parent and everything that hangs off them: their children's
    links, their inbox, and the push subscriptions, so their phone stops
    receiving notifications the moment the entry is gone. Every table that
    references parents belongs here — a missing one does not fail quietly, it
    makes the parent undeletable with a foreign-key error. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const id = idParam(event)
  await parentInScope(me, id)
  const db = (await useDb())
  await db.transaction(async tx => {
    await tx.delete(s.parentChildren).where(eq(s.parentChildren.parentId, id))
    await tx.delete(s.parentNotifications).where(eq(s.parentNotifications.parentId, id))
    await tx.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.parentId, id))
    await tx.delete(s.parents).where(eq(s.parents.id, id))
  })
  return { ok: true }
})
