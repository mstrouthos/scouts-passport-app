import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { requireLeader, idParam, assertScoutInScope } from '../../../../../utils/guard'
import { assertCan } from '../../../../../utils/permissions'
import { childIdsOfParent } from '../../../../../utils/parents'

/** Take a parent off one child. A family with another child keeps its row,
    its code and its other link; only when this was their last child does the
    parent go entirely — there is nobody left for them to be a parent of. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const scoutId = idParam(event)
  const parentId = Number(getRouterParam(event, 'pid'))
  if (!Number.isInteger(parentId)) throw createError({ statusCode: 400, message: 'Bad id' })
  await assertScoutInScope(me, scoutId)
  const db = (await useDb())
  const p = (await db.select().from(s.parents).where(eq(s.parents.id, parentId)).limit(1))[0]
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })

  await db.transaction(async tx => {
    await tx.delete(s.parentChildren)
      .where(and(eq(s.parentChildren.parentId, parentId), eq(s.parentChildren.scoutId, scoutId)))
    const remaining = childIdsOfParent(
      { ...p, scoutId: p.scoutId === scoutId ? null : p.scoutId },
      await tx.select().from(s.parentChildren)
    )
    if (remaining.length) {
      // the old single-child column must not keep pointing at the child we just removed
      if (p.scoutId === scoutId) await tx.update(s.parents).set({ scoutId: remaining[0] }).where(eq(s.parents.id, parentId))
    } else {
      await tx.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.parentId, parentId))
      await tx.delete(s.parents).where(eq(s.parents.id, parentId))
    }
    return remaining.length
  })
  return { ok: true }
})
