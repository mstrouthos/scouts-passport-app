import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../../utils/guard'
import { assertCan } from '../../../../utils/permissions'

/** Link an existing parent to one more child. The child must be in the
    leader's own sector; the parent may have been entered by anyone. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const parentId = idParam(event)
  const scoutId = Number((await readBody<any>(event))?.scoutId)
  if (!Number.isInteger(scoutId)) throw createError({ statusCode: 400, message: 'Pick the scout' })
  await assertScoutInScope(me, scoutId)
  const db = await useDb()
  const p = (await db.select().from(s.parents).where(eq(s.parents.id, parentId)).limit(1))[0]
  if (!p || !p.isActive) throw createError({ statusCode: 404, message: 'Not found' })
  await db.insert(s.parentChildren).values({ parentId, scoutId }).onConflictDoNothing()
  return { ok: true, linked: true }
})
