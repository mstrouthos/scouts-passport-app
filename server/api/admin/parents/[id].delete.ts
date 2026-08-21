import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'
import { parentInScope } from './[id].patch'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await parentInScope(me, id)
  await (await useDb()).delete(s.parents).where(eq(s.parents.id, id))
  return { ok: true }
})
