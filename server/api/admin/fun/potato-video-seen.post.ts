import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'

/** I have seen the video that explains the hot potato: it is not played to me
    with a new round again (it stays in the rules, for whoever wants it). */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  await db.update(s.scouts).set({ potatoVideoSeen: new Date().toISOString() })
    .where(and(eq(s.scouts.id, me.id), isNull(s.scouts.potatoVideoSeen)))
  return { ok: true }
})
