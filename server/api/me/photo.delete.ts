import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { deleteStored } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (!me.photoFileId) return { ok: true }
  const db = await useDb()
  const old = (await db.select().from(s.files).where(eq(s.files.id, me.photoFileId)).limit(1))[0]
  if (old) { await deleteStored(old.data); await db.delete(s.files).where(eq(s.files.id, old.id)) }
  await db.update(s.scouts).set({ photoFileId: null }).where(eq(s.scouts.id, me.id))
  return { ok: true }
})
