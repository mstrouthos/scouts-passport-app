import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'

/** The Αρχηγός Συστήματος writes the list of challenges; an empty list goes
    back to the app's own. A round already in play keeps the one it drew. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.role !== 'troop_leader') throw createError({ statusCode: 403, message: 'Μόνο για διαχειριστές' })
  const raw = (await readBody<{ challenges?: string[] }>(event))?.challenges
  const list = [...new Set((Array.isArray(raw) ? raw : []).map(x => String(x).trim().slice(0, 200)).filter(Boolean))].slice(0, 60)
  const value = JSON.stringify(list.length ? list : null)
  const db = await useDb()
  await db.insert(s.settings).values({ key: 'potato.challenges', value }).onConflictDoUpdate({ target: s.settings.key, set: { value } })
  return { ok: true, count: list.length }
})
