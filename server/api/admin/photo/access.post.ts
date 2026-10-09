import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireTroopLeader } from '../../../utils/guard'

/** The Αρχηγός Συστήματος lets a Βαθμοφόρος into the photo game while it is
    tried out — or takes them out of it. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const b = await readBody<{ scoutId?: number, on?: boolean }>(event)
  const db = await useDb()
  const who = (await db.select().from(s.scouts).where(eq(s.scouts.id, Number(b?.scoutId))).limit(1))[0]
  if (!who || who.role === 'scout' || who.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(s.scouts).set({ photoGame: !!b?.on }).where(eq(s.scouts.id, who.id))
  return { ok: true }
})
