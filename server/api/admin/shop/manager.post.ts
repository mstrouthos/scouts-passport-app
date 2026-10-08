import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireTroopLeader } from '../../../utils/guard'

/** The Αρχηγός Συστήματος gives a Βαθμοφόρος the running of the shop, or takes it back. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const b = await readBody<{ scoutId?: number, on?: boolean }>(event)
  const id = Number(b?.scoutId)
  const db = await useDb()
  const who = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
  if (!who || who.role === 'scout' || who.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(s.scouts).set({ shopManager: !!b?.on }).where(eq(s.scouts.id, id))
  return { ok: true }
})
