import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'
import { normalizeAvatar } from '../../../utils/avatar'

/** A member saves the avatar they made. Members only — Βαθμοφόροι have a
    photo instead. Only known choices are kept. null takes it away. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (me.role !== 'scout') throw createError({ statusCode: 403, message: 'Οι Βαθμοφόροι έχουν φωτογραφία προφίλ' })
  const b = await readBody<{ avatar?: any }>(event)
  const avatar = b?.avatar ? normalizeAvatar(b.avatar) : null
  const db = await useDb()
  await db.update(s.scouts).set({ avatar: avatar ? JSON.stringify(avatar) : null }).where(eq(s.scouts.id, me.id))
  return { avatar }
})
