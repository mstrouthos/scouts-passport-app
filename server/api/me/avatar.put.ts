import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'
import { normalizeAvatar, withoutLocked } from '../../../utils/avatar'
import { syncRewards } from '../../utils/rewards'
import { deleteStored } from '../../utils/storage'

/** Someone saves the avatar they made. Anyone may: members always use one,
    and a Βαθμοφόρος may choose it over a photo — in which case their photo
    is taken down, since only one of the two is shown. Only known choices
    are kept. null takes it away. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const b = await readBody<{ avatar?: any }>(event)
  // limited-edition items only for those who have earned them
  const avatar = b?.avatar ? withoutLocked(normalizeAvatar(b.avatar), (await syncRewards(me.id)).unlocked) : null
  const db = await useDb()
  await db.update(s.scouts).set({ avatar: avatar ? JSON.stringify(avatar) : null }).where(eq(s.scouts.id, me.id))
  if (avatar && me.role !== 'scout' && me.photoFileId) {
    const old = (await db.select().from(s.files).where(eq(s.files.id, me.photoFileId)).limit(1))[0]
    if (old) { await deleteStored(old.data); await db.delete(s.files).where(eq(s.files.id, old.id)) }
    await db.update(s.scouts).set({ photoFileId: null }).where(eq(s.scouts.id, me.id))
  }
  return { avatar }
})
