import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'

/** I have seen the video that explains the photo game: it does not open by
    itself again (it stays behind ℹ️, for whoever wants it). */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  await db.update(s.scouts).set({ photoVideoSeen: new Date().toISOString() })
    .where(and(eq(s.scouts.id, me.id), isNull(s.scouts.photoVideoSeen)))
  return { ok: true }
})
