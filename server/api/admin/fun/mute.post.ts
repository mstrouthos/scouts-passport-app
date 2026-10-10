import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireTroopLeader } from '../../../utils/guard'

/** An administrator keeps the mini-games' news off a Βαθμοφόρος's phone
    (it still waits in each game's 🔔) — or lets it through again. Theirs
    to keep off, but not to turn back on, while it stands. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const b = await readBody<{ id?: number, muted?: boolean }>(event)
  const db = await useDb()
  const who = (await db.select().from(s.scouts).where(eq(s.scouts.id, Number(b?.id))).limit(1))[0]
  if (!who || who.role === 'scout') throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(s.scouts).set({ gameNotifsBlocked: !!b?.muted, gameNotifsBlockedBy: b?.muted ? me.id : null }).where(eq(s.scouts.id, who.id))
  return { ok: true }
})
