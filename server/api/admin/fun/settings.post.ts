import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'

/** A Βαθμοφόρος's own say in the playground — everything, only the kind
    things, or out of it — and, for the Αρχηγός Συστήματος, pausing it for all. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ pref?: string, paused?: boolean }>(event)
  const db = await useDb()
  if (b?.pref !== undefined) {
    const pref = ['all', 'kind', 'off'].includes(String(b.pref)) ? String(b.pref) : 'all'
    await db.update(s.scouts).set({ funPref: pref }).where(eq(s.scouts.id, me.id))
  }
  if (b?.paused !== undefined) {
    if (me.role !== 'troop_leader') throw createError({ statusCode: 403, message: 'Μόνο ο Αρχηγός Συστήματος' })
    const value = b.paused ? '1' : '0'
    await db.insert(s.settings).values({ key: 'fun.paused', value }).onConflictDoUpdate({ target: s.settings.key, set: { value } })
  }
  return { ok: true }
})
