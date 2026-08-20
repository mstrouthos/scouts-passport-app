import { requireLeader, assertScoutInScope, idParam } from '../../../utils/guard'
import { cascadeDeleteScout } from '../../../utils/deleteScout'

/** Permanent deletion — cascades every row that references this scout, then
    removes the scout itself. Deactivate (see PATCH) is the reversible default;
    this is for when a record genuinely needs to be gone. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await assertScoutInScope(me, id)
  try {
    await cascadeDeleteScout(id)
  } catch {
    throw createError({ statusCode: 400, message: 'This record still has linked history and cannot be deleted' })
  }
  return { ok: true }
})
