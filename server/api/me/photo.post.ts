import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { storeFile, deleteStored } from '../../utils/storage'
import { now } from '../../utils/passcode'

/** A Βαθμοφόρος sets their profile photo. Leaders only: members, who are
    children, make an avatar instead and never upload a picture of
    themselves. The phone crops and shrinks it first; this only guards. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ mime?: string, dataBase64?: string }>(event)
  if (b?.mime !== 'image/jpeg') throw createError({ statusCode: 400, message: 'Μόνο εικόνα JPEG' })
  const buf = Buffer.from(String(b?.dataBase64 || ''), 'base64')
  if (!buf.length || buf[0] !== 0xFF || buf[1] !== 0xD8) throw createError({ statusCode: 400, message: 'Μη έγκυρη εικόνα' })
  if (buf.length > 2 * 1024 * 1024) throw createError({ statusCode: 400, message: 'Η φωτογραφία είναι πολύ μεγάλη' })
  const db = await useDb()
  const name = `photo-${me.id}.jpg`
  const [f] = await db.insert(s.files).values({
    name, mime: 'image/jpeg', size: buf.length, data: await storeFile(buf, 'image/jpeg', name, 'photos'), uploadedBy: me.id, createdAt: now()
  }).returning()
  // the previous photo goes, from the bucket too
  if (me.photoFileId) {
    const old = (await db.select().from(s.files).where(eq(s.files.id, me.photoFileId)).limit(1))[0]
    if (old) { await deleteStored(old.data); await db.delete(s.files).where(eq(s.files.id, old.id)) }
  }
  await db.update(s.scouts).set({ photoFileId: f.id }).where(eq(s.scouts.id, me.id))
  return { photo: `/api/photo/${f.id}` }
})
